import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getProductImage } from '@/lib/types';

// Indian Cafe Menu Items with INR pricing
const INDIAN_MENU_ITEMS = [
  // Beverages - Chai Varieties
  { name: 'Masala Chai', category: 'Beverages', quantity: 50, unit: 'cups', minStock: 10, price: 15, supplier: 'Local Tea Supplier' },
  { name: 'Ginger Chai', category: 'Beverages', quantity: 50, unit: 'cups', minStock: 10, price: 15, supplier: 'Local Tea Supplier' },
  { name: 'Cardamom Chai', category: 'Beverages', quantity: 50, unit: 'cups', minStock: 10, price: 15, supplier: 'Local Tea Supplier' },
  { name: 'Elaichi Chai', category: 'Beverages', quantity: 50, unit: 'cups', minStock: 10, price: 20, supplier: 'Local Tea Supplier' },
  { name: 'Tulsi Chai', category: 'Beverages', quantity: 30, unit: 'cups', minStock: 8, price: 20, supplier: 'Local Tea Supplier' },
  
  // Beverages - Coffee
  { name: 'Filter Coffee', category: 'Beverages', quantity: 40, unit: 'cups', minStock: 10, price: 25, supplier: 'Coffee Traders' },
  { name: 'Instant Coffee', category: 'Beverages', quantity: 60, unit: 'cups', minStock: 15, price: 20, supplier: 'Coffee Traders' },
  { name: 'Cold Coffee', category: 'Beverages', quantity: 30, unit: 'cups', minStock: 8, price: 40, supplier: 'Coffee Traders' },
  
  // Beverages - Others
  { name: 'Lemon Tea', category: 'Beverages', quantity: 40, unit: 'cups', minStock: 10, price: 15, supplier: 'Local Tea Supplier' },
  { name: 'Green Tea', category: 'Beverages', quantity: 35, unit: 'cups', minStock: 8, price: 20, supplier: 'Local Tea Supplier' },
  { name: 'Lassi - Sweet', category: 'Beverages', quantity: 25, unit: 'glasses', minStock: 5, price: 30, supplier: 'Dairy Fresh' },
  { name: 'Lassi - Salted', category: 'Beverages', quantity: 25, unit: 'glasses', minStock: 5, price: 30, supplier: 'Dairy Fresh' },
  { name: 'Buttermilk', category: 'Beverages', quantity: 30, unit: 'glasses', minStock: 8, price: 20, supplier: 'Dairy Fresh' },
  { name: 'Nimbu Pani', category: 'Beverages', quantity: 40, unit: 'glasses', minStock: 10, price: 20, supplier: 'Fresh Fruits' },
  { name: 'Mango Juice', category: 'Beverages', quantity: 20, unit: 'glasses', minStock: 5, price: 40, supplier: 'Fresh Fruits' },
  
  // Snacks - Pakoras & Fried Items
  { name: 'Samosa', category: 'Snacks', quantity: 100, unit: 'pcs', minStock: 20, price: 15, supplier: 'Local Snacks' },
  { name: 'Aloo Pakora', category: 'Snacks', quantity: 80, unit: 'pcs', minStock: 15, price: 20, supplier: 'Local Snacks' },
  { name: 'Paneer Pakora', category: 'Snacks', quantity: 60, unit: 'pcs', minStock: 12, price: 30, supplier: 'Local Snacks' },
  { name: 'Onion Bhaji', category: 'Snacks', quantity: 70, unit: 'pcs', minStock: 15, price: 20, supplier: 'Local Snacks' },
  { name: 'Mix Pakora', category: 'Snacks', quantity: 60, unit: 'pcs', minStock: 12, price: 25, supplier: 'Local Snacks' },
  { name: 'Bread Pakora', category: 'Snacks', quantity: 50, unit: 'pcs', minStock: 10, price: 20, supplier: 'Local Snacks' },
  { name: 'Mirchi Bhaji', category: 'Snacks', quantity: 40, unit: 'pcs', minStock: 10, price: 15, supplier: 'Local Snacks' },
  
  // Snacks - Chaats
  { name: 'Pani Puri', category: 'Snacks', quantity: 50, unit: 'plates', minStock: 10, price: 30, supplier: 'Chaat Corner' },
  { name: 'Bhel Puri', category: 'Snacks', quantity: 40, unit: 'plates', minStock: 8, price: 30, supplier: 'Chaat Corner' },
  { name: 'Sev Puri', category: 'Snacks', quantity: 35, unit: 'plates', minStock: 8, price: 35, supplier: 'Chaat Corner' },
  { name: 'Dahi Puri', category: 'Snacks', quantity: 30, unit: 'plates', minStock: 6, price: 40, supplier: 'Chaat Corner' },
  { name: 'Papdi Chaat', category: 'Snacks', quantity: 30, unit: 'plates', minStock: 6, price: 40, supplier: 'Chaat Corner' },
  
  // Main Meals
  { name: 'Pav Bhaji', category: 'Meals', quantity: 40, unit: 'plates', minStock: 8, price: 60, supplier: 'Kitchen Fresh' },
  { name: 'Vada Pav', category: 'Meals', quantity: 100, unit: 'pcs', minStock: 20, price: 20, supplier: 'Kitchen Fresh' },
  { name: 'Misal Pav', category: 'Meals', quantity: 30, unit: 'plates', minStock: 6, price: 50, supplier: 'Kitchen Fresh' },
  { name: 'Poha', category: 'Meals', quantity: 35, unit: 'plates', minStock: 7, price: 30, supplier: 'Kitchen Fresh' },
  { name: 'Upma', category: 'Meals', quantity: 30, unit: 'plates', minStock: 6, price: 30, supplier: 'Kitchen Fresh' },
  { name: 'Chole Bhature', category: 'Meals', quantity: 25, unit: 'plates', minStock: 5, price: 80, supplier: 'Kitchen Fresh' },
  { name: 'Dosa - Plain', category: 'Meals', quantity: 40, unit: 'pcs', minStock: 8, price: 40, supplier: 'South Kitchen' },
  { name: 'Dosa - Masala', category: 'Meals', quantity: 40, unit: 'pcs', minStock: 8, price: 50, supplier: 'South Kitchen' },
  { name: 'Idli Sambhar', category: 'Meals', quantity: 35, unit: 'plates', minStock: 7, price: 35, supplier: 'South Kitchen' },
  { name: 'Medu Vada', category: 'Meals', quantity: 30, unit: 'pcs', minStock: 6, price: 30, supplier: 'South Kitchen' },
  { name: 'Uttapam', category: 'Meals', quantity: 25, unit: 'pcs', minStock: 5, price: 50, supplier: 'South Kitchen' },
  
  // Quick Bites
  { name: 'Maggi', category: 'Quick Bites', quantity: 80, unit: 'plates', minStock: 15, price: 30, supplier: 'Quick Foods' },
  { name: 'Sandwich - Veg', category: 'Quick Bites', quantity: 50, unit: 'pcs', minStock: 10, price: 40, supplier: 'Quick Foods' },
  { name: 'Sandwich - Cheese', category: 'Quick Bites', quantity: 40, unit: 'pcs', minStock: 8, price: 50, supplier: 'Quick Foods' },
  { name: 'Grilled Sandwich', category: 'Quick Bites', quantity: 35, unit: 'pcs', minStock: 7, price: 60, supplier: 'Quick Foods' },
  { name: 'Toast - Butter', category: 'Quick Bites', quantity: 60, unit: 'pcs', minStock: 12, price: 20, supplier: 'Quick Foods' },
  { name: 'Bun Maska', category: 'Quick Bites', quantity: 50, unit: 'pcs', minStock: 10, price: 25, supplier: 'Bakery Fresh' },
  
  // Sweets & Desserts
  { name: 'Gulab Jamun', category: 'Sweets', quantity: 50, unit: 'pcs', minStock: 10, price: 15, supplier: 'Sweet House' },
  { name: 'Jalebi', category: 'Sweets', quantity: 40, unit: 'pcs', minStock: 8, price: 20, supplier: 'Sweet House' },
  { name: 'Rasgulla', category: 'Sweets', quantity: 30, unit: 'pcs', minStock: 6, price: 20, supplier: 'Sweet House' },
  { name: 'Kulfi', category: 'Sweets', quantity: 30, unit: 'pcs', minStock: 6, price: 25, supplier: 'Ice Cream Co' },
  { name: 'Ice Cream - Vanilla', category: 'Sweets', quantity: 20, unit: 'scoops', minStock: 5, price: 30, supplier: 'Ice Cream Co' },
  { name: 'Ice Cream - Chocolate', category: 'Sweets', quantity: 20, unit: 'scoops', minStock: 5, price: 30, supplier: 'Ice Cream Co' },
  
  // Breads & Accompaniments
  { name: 'Pav', category: 'Accompaniments', quantity: 200, unit: 'pcs', minStock: 40, price: 5, supplier: 'Bakery Fresh' },
  { name: 'Kulcha', category: 'Accompaniments', quantity: 50, unit: 'pcs', minStock: 10, price: 15, supplier: 'Bakery Fresh' },
  { name: 'Paratha - Plain', category: 'Accompaniments', quantity: 40, unit: 'pcs', minStock: 8, price: 20, supplier: 'Kitchen Fresh' },
  { name: 'Paratha - Aloo', category: 'Accompaniments', quantity: 35, unit: 'pcs', minStock: 7, price: 30, supplier: 'Kitchen Fresh' },
  { name: 'Roti', category: 'Accompaniments', quantity: 60, unit: 'pcs', minStock: 12, price: 10, supplier: 'Kitchen Fresh' },
];

export async function POST(request: Request) {
  try {
    // Check if inventory already has items
    const inventorySnapshot = await getDocs(collection(db, 'inventory'));
    
    if (inventorySnapshot.size > 0) {
      return NextResponse.json({ 
        message: 'Inventory already contains items. Skipping initialization.',
        itemCount: inventorySnapshot.size 
      }, { status: 200 });
    }

    // Add all menu items to inventory
    const promises = INDIAN_MENU_ITEMS.map(item => 
      addDoc(collection(db, 'inventory'), {
        ...item,
        imageUrl: getProductImage(item.name),
        cafeId: 'default', // Default cafe for demo
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastRestocked: new Date().toISOString()
      })
    );

    await Promise.all(promises);

    return NextResponse.json({ 
      message: 'Successfully initialized Indian cafe menu items',
      itemCount: INDIAN_MENU_ITEMS.length,
      categories: [...new Set(INDIAN_MENU_ITEMS.map(i => i.category))]
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error initializing menu items:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize menu items',
      details: error.message 
    }, { status: 500 });
  }
}
