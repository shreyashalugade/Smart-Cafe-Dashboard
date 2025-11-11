'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, formatDate } from '@/lib/utils/helpers';
import { getProductImage } from '@/lib/types';
import { useAuth } from '@/lib/firebase/auth-context';
import type { InventoryItem } from '@/lib/types';

export default function InventoryView() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [initializing, setInitializing] = useState(false);
  const { userData } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('');
  const [minStock, setMinStock] = useState(0);
  const [price, setPrice] = useState(0);
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      let inventoryData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as InventoryItem));
      
      // Filter by cafe if user is not super admin
      if (userData?.role !== 'super_admin' && userData?.cafeId) {
        inventoryData = inventoryData.filter(item => item.cafeId === userData.cafeId);
      }
      
      setInventory(inventoryData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeMenu = async () => {
    if (!confirm('This will add Indian cafe menu items to your inventory. Continue?')) {
      return;
    }

    setInitializing(true);
    try {
      const response = await fetch('/api/init-data', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Success! Added ${data.itemCount} Indian menu items to inventory.`);
        await loadInventory();
      } else {
        alert(`Error: ${data.message || 'Failed to initialize menu items'}`);
      }
    } catch (error) {
      console.error('Error initializing menu:', error);
      alert('Failed to initialize menu items. Please try again.');
    } finally {
      setInitializing(false);
    }
  };

  const validateInventoryItem = (): string | null => {
    // Validate name
    if (!name.trim()) {
      return 'Item name is required';
    }

    // Validate category
    if (!category.trim()) {
      return 'Category is required';
    }

    // Validate quantity
    if (quantity < 0) {
      return 'Quantity cannot be negative';
    }

    // Validate unit
    if (!unit.trim()) {
      return 'Unit is required';
    }

    // Validate min stock
    if (minStock < 0) {
      return 'Minimum stock cannot be negative';
    }

    // Validate price
    if (price < 0) {
      return 'Price cannot be negative';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = validateInventoryItem();
    if (validationError) {
      alert(validationError);
      return;
    }

    const itemData: Omit<InventoryItem, 'id'> = {
      name: name.trim(),
      category: category.trim(),
      quantity,
      unit: unit.trim(),
      minStock,
      price,
      supplier: supplier.trim(),
      imageUrl: getProductImage(name.trim()),
      cafeId: userData?.role === 'super_admin' ? 'default' : (userData?.cafeId || 'default'),
      lastRestocked: new Date().toISOString(),
      createdAt: selectedItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (selectedItem) {
        await updateDoc(doc(db, 'inventory', selectedItem.id), itemData);
      } else {
        await addDoc(collection(db, 'inventory'), itemData);
      }
      await loadInventory();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Failed to save inventory item. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
        await loadInventory();
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        alert('Failed to delete inventory item');
      }
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setQuantity(0);
    setUnit('');
    setMinStock(0);
    setPrice(0);
    setSupplier('');
    setSelectedItem(null);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setMinStock(item.minStock);
    setPrice(item.price);
    setSupplier(item.supplier || '');
    setShowModal(true);
  };

  const categories = [...new Set(inventory.map(item => item.category))];
  const filteredInventory = filterCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.category === filterCategory);

  const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
        <div className="flex gap-2">
          {inventory.length === 0 && (
            <Button
              variant="success"
              onClick={handleInitializeMenu}
              disabled={initializing}
            >
              {initializing ? 'Loading...' : 'Load Indian Menu Items'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                  Low Stock Alert
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  The following items need restocking:
                </p>
                <ul className="mt-2 space-y-1">
                  {lowStockItems.map(item => (
                    <li key={item.id} className="text-sm text-orange-700 dark:text-orange-300">
                      <strong>{item.name}</strong>: {item.quantity} {item.unit} (Min: {item.minStock})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Items</CardTitle>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-48"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Min Stock
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Restocked
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInventory.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      item.quantity <= item.minStock ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <img 
                        src={item.imageUrl || getProductImage(item.name)} 
                        alt={item.name}
                        className="product-image float-animation"
                        onError={(e) => {
                          e.currentTarget.src = getProductImage('default');
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.name}
                      {item.quantity <= item.minStock && (
                        <AlertTriangle className="inline w-4 h-4 ml-2 text-orange-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.supplier || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {item.lastRestocked ? formatDate(item.lastRestocked) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={selectedItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Beverages, Food, Supplies"
              required
            />

            <Input
              type="number"
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              min="0"
              step="0.01"
              required
            />

            <Input
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., kg, L, pcs"
              required
            />

            <Input
              type="number"
              label="Minimum Stock"
              value={minStock}
              onChange={(e) => setMinStock(parseFloat(e.target.value))}
              min="0"
              step="0.01"
              required
            />

            <Input
              type="number"
              label="Price"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              min="0"
              step="0.01"
              required
            />
          </div>

          <Input
            label="Supplier (Optional)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
            >
              {selectedItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
