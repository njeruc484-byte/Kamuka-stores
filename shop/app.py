from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from functools import wraps
import os
import time
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

# ========== CONFIGURATION ==========

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# Create folders
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, 'uploads'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'instance'), exist_ok=True)

app = Flask(__name__, 
            template_folder=TEMPLATES_DIR,
            static_folder=STATIC_DIR)

app.secret_key = "change-this-to-a-random-secret-key"

# Upload configuration
app.config['UPLOAD_FOLDER'] = os.path.join(STATIC_DIR, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = generate_password_hash("admin123")

# ========== DATABASE SETUP ==========

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    image = Column(String(255), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'image': f'/static/uploads/{self.image}'
        }

DATABASE_PATH = os.path.join(BASE_DIR, 'instance', 'shop.db')
engine = create_engine(f'sqlite:///{DATABASE_PATH}', echo=False)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# ========== HELPER FUNCTIONS ==========

def get_db():
    return Session()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            flash('Please login to access this page.', 'warning')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# ========== ROUTES ==========

@app.route('/')
def index():
    db = get_db()
    products = db.query(Product).order_by(Product.id.desc()).all()
    db.close()
    return render_template('index.html', products=products)

@app.route('/api/products')
def api_products():
    db = get_db()
    products = db.query(Product).order_by(Product.id.desc()).all()
    db.close()
    
    products_list = [product.to_dict() for product in products]
    
    return jsonify({
        'success': True,
        'products': products_list
    })

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    db = get_db()
    product = db.query(Product).filter(Product.id == product_id).first()
    db.close()
    if product:
        return render_template('product_detail.html', product=product)
    flash('Product not found.', 'error')
    return redirect(url_for('index'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, password):
            session['admin_logged_in'] = True
            flash('Login successful!', 'success')
            return redirect(url_for('upload'))
        else:
            flash('Invalid username or password.', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/upload', methods=['GET', 'POST'])
@admin_required
def upload():
    db = get_db()
    products = db.query(Product).order_by(Product.id.desc()).all()
    db.close()
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        price_str = request.form.get('price', '')
        image = request.files.get('image')
        
        errors = []
        if not name:
            errors.append('Product name is required.')
        if not price_str:
            errors.append('Price is required.')
        else:
            try:
                price = float(price_str)
                if price < 0:
                    errors.append('Price must be greater than 0.')
            except ValueError:
                errors.append('Please enter a valid price.')
        if not image or image.filename == '':
            errors.append('Please select an image file.')
        elif not allowed_file(image.filename):
            errors.append('Invalid file format. Allowed: PNG, JPG, JPEG, GIF, WEBP')
        
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('upload.html', products=products)
        
        try:
            timestamp = int(time.time())
            original_filename = secure_filename(image.filename)
            unique_filename = f"{timestamp}_{original_filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image.save(filepath)
            
            new_product = Product(
                name=name,
                description=description,
                price=price,
                image=unique_filename
            )
            db = get_db()
            db.add(new_product)
            db.commit()
            db.close()
            
            flash(f'✅ Product "{name}" added successfully!', 'success')
            return redirect(url_for('upload'))
        except Exception as e:
            flash(f'❌ Error: {str(e)}', 'error')
        
        db = get_db()
        products = db.query(Product).order_by(Product.id.desc()).all()
        db.close()
        return render_template('upload.html', products=products)
    
    return render_template('upload.html', products=products)

@app.route('/delete_product/<int:product_id>')
@admin_required
def delete_product(product_id):
    db = get_db()
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if product:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], product.image)
        if os.path.exists(image_path):
            os.remove(image_path)
        
        db.delete(product)
        db.commit()
        flash(f'✅ Product "{product.name}" deleted successfully!', 'success')
    else:
        flash('Product not found.', 'error')
    
    db.close()
    return redirect(url_for('upload'))

@app.route('/debug/products')
def debug_products():
    db = get_db()
    products = db.query(Product).all()
    db.close()
    
    html = f"<h1>Products: {len(products)}</h1>"
    for p in products:
        html += f"<p>ID: {p.id}, Name: {p.name}, Price: {p.price}</p>"
    html += '<p><a href="/">Home</a> | <a href="/upload">Admin</a></p>'
    return html

# ========== RUN ==========

if __name__ == '__main__':
    print("\n" + "="*50)
    print(f"✅ Shop is running!")
    print(f"📍 http://localhost:5000")
    print(f"🔐 Admin: http://localhost:5000/admin/login")
    print(f"👤 Username: admin | Password: admin123")
    print("="*50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)