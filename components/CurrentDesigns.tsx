import React from 'react';
import { Product } from '../types';

interface CurrentDesignsProps {
  products: Product[];
  onSelect: (p: Product) => void;
}

const CurrentDesigns: React.FC<CurrentDesignsProps> = ({ products, onSelect }) => {
  return (
    <div className="px-2">
      <h4 className="text-xs text-slate-500 uppercase mb-2">Current Designs</h4>
      {products.length === 0 ? (
        <div className="text-xs text-slate-400">No designs loaded</div>
      ) : (
        <ul className="space-y-2">
          {products.slice(0,6).map(p => (
            <li key={p.id}>
              <button onClick={() => onSelect(p)} className="text-left text-slate-200 hover:underline text-sm">
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CurrentDesigns;
