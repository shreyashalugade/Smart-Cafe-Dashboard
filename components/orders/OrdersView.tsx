'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, formatDate, generateOrderNumber } from '@/lib/utils/helpers';
import { getProductImage } from '@/lib/types';
import { useAuth } from '@/lib/firebase/auth-context';
import type { Order, OrderItem } from '@/lib/types';

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { userData } = useAuth();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', name: '', quantity: 1, price: 0, subtotal: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'orders'));
      let ordersData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));
      
      // Filter by cafe if user is not super admin
      if (userData?.role !== 'super_admin' && userData?.cafeId) {
        ordersData = ordersData.filter(order => order.cafeId === userData.cafeId);
      }
      
      setOrders(ordersData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      name: '', 
      quantity: 1, 
      price: 0, 
      subtotal: 0 
    }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'price' || field === 'quantity') {
          updated.subtotal = updated.price * updated.quantity;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const validateOrder = (): string | null => {
    // Validate customer name
    if (!customerName.trim()) {
      return 'Customer name is required';
    }

    // Validate items
    if (items.length === 0) {
      return 'At least one item is required';
    }

    for (const item of items) {
      if (!item.name.trim()) {
        return 'All items must have a name';
      }
      if (item.quantity <= 0) {
        return 'Item quantity must be greater than 0';
      }
      if (item.price < 0) {
        return 'Item price cannot be negative';
      }
    }

    // Validate total
    const total = calculateTotal();
    if (total <= 0) {
      return 'Order total must be greater than 0';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = validateOrder();
    if (validationError) {
      alert(validationError);
      return;
    }

    const orderData: Omit<Order, 'id'> = {
      orderNumber: generateOrderNumber(),
      customerName: customerName.trim(),
      items: items.map(item => ({
        ...item,
        imageUrl: getProductImage(item.name)
      })),
      total: calculateTotal(),
      status: 'pending',
      paymentStatus,
      paymentMethod,
      cafeId: userData?.role === 'super_admin' ? 'default' : (userData?.cafeId || 'default'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (selectedOrder) {
        await updateDoc(doc(db, 'orders', selectedOrder.id), orderData);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
      }
      await loadOrders();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'orders', id));
        await loadOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
      }
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === 'completed' && { completedAt: new Date().toISOString() })
      });
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setItems([{ id: '1', name: '', quantity: 1, price: 0, subtotal: 0 }]);
    setPaymentMethod('cash');
    setPaymentStatus('unpaid');
    setSelectedOrder(null);
  };

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setCustomerName(order.customerName);
    setItems(order.items);
    setPaymentMethod(order.paymentMethod || 'cash');
    setPaymentStatus(order.paymentStatus);
    setShowModal(true);
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      ready: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      completed: 'bg-gray-100 text-gray-100 dark:bg-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    return colors[status];
  };

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Orders</CardTitle>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-48"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-100 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-100 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-100 dark:text-gray-300">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-100 dark:text-gray-300">
                      {order.items.length} items
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order, e.target.value as Order['status'])}
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-100 dark:text-gray-300">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(order)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
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
        title={selectedOrder ? 'Edit Order' : 'New Order'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-100 dark:text-gray-300 mb-2">
              Order Items
            </label>
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                  required
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                  min="1"
                  required
                  className="w-20"
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                  required
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </Select>

            <Select
              label="Payment Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </Select>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total:</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
            <div className="flex gap-2">
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
                {selectedOrder ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
