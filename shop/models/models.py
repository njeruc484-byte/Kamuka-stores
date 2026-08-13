from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    image = Column(String(255), nullable=False)
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"