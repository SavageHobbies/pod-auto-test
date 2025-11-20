
import React, { useEffect } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';
import XIcon from './icons/XIcon.tsx';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-600/95' : 'bg-red-600/95';
  const icon = isSuccess ? <CheckCircleIcon className="w-6 h-6 text-white" /> : <XCircleIcon className="w-6 h-6 text-white" />;

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} animate-fade-in-down`}>
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="ml-3 text-sm font-medium">
        {message}
      </div>
      <button onClick={onClose} className="ml-auto -mr-1 p-1.5 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Notification;
    