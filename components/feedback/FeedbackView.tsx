'use client';

import { useEffect, useState } from 'react';
import { Star, Download, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatDate } from '@/lib/utils/helpers';
import type { Feedback } from '@/lib/types';
import QRCodeLib from 'qrcode';

export default function FeedbackView() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'feedback'));
      const feedbackData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Feedback));
      setFeedback(feedbackData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      const feedbackUrl = `${window.location.origin}/feedback-form`;
      const qrCode = await QRCodeLib.toDataURL(feedbackUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCode);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'feedback-qr-code.png';
    link.click();
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const categories = [...new Set(feedback.map(f => f.category))];
  const filteredFeedback = feedback.filter(f => {
    if (filterRating !== 'all' && f.rating !== filterRating) return false;
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    return true;
  });

  const averageRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: feedback.filter(f => f.rating === rating).length,
    percentage: feedback.length > 0 
      ? ((feedback.filter(f => f.rating === rating).length / feedback.length) * 100).toFixed(0)
      : '0'
  }));

  if (loading) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Feedback</h1>
        <Button variant="primary" onClick={generateQRCode}>
          <QrCode className="w-4 h-4 mr-2" />
          Generate QR Code
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {averageRating}
              </div>
              <div className="flex items-center justify-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= parseFloat(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Based on {feedback.length} reviews
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
                    {rating}
                  </span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>All Feedback</CardTitle>
            <div className="flex gap-2">
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {item.customerName || 'Anonymous'}
                    </h4>
                    {item.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= item.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-sm font-medium ${getRatingColor(item.rating)}`}>
                      {item.rating}/5
                    </span>
                  </div>
                </div>
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                    {item.category}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  {item.comment}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
            {filteredFeedback.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No feedback found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Feedback QR Code"
      >
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Customers can scan this QR code to leave feedback
          </p>
          {qrCodeUrl && (
            <>
              <img
                src={qrCodeUrl}
                alt="Feedback QR Code"
                className="mx-auto mb-4"
              />
              <Button variant="primary" onClick={downloadQRCode}>
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
