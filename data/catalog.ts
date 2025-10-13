import { Product } from '../types.ts';

export const productCatalog: Product[] = [
  {
    id: 101,
    name: 'Unisex Heavy Cotton Tee',
    type: 'T-Shirt',
    description: 'A classic, durable cotton t-shirt.',
    imageUrl: 'https://images.printify.com/5a285a21b8e7e36577416307',
    providers: [
      { id: 1, name: 'Print Provider 1', price: 10.50 },
      { id: 2, name: 'Monster Digital', price: 11.25 },
      { id: 3, name: 'Swift POD', price: 10.80 },
    ],
    variants: [
        { id: 1, name: 'Color', options: [
            { value: 'White', hex: '#FFFFFF' }, { value: 'Black', hex: '#000000' }, 
            { value: 'Navy', hex: '#0a1d3d' }, { value: 'Heather Grey', hex: '#b5b5b5' },
            { value: 'Red', hex: '#c41c2b' }, { value: 'Royal Blue', hex: '#1667be' },
            { value: 'Kelly Green', hex: '#449650' }, { value: 'Maroon', hex: '#5b1d2f' },
            { value: 'Charcoal', hex: '#464646' }, { value: 'Purple', hex: '#482d54' },
            { value: 'Orange', hex: '#f06421' }, { value: 'Yellow', hex: '#ffcd00' },
            { value: 'Pink', hex: '#ffabc9' }, { value: 'Light Blue', hex: '#a5cce3' },
            { value: 'Forest Green', hex: '#22402f' }, { value: 'Sand', hex: '#d1c5ad' },
        ]},
    ]
  },
  {
    id: 201,
    name: 'Unisex Heavy Blend Hoodie',
    type: 'Hoodie',
    description: 'A cozy and warm hoodie for all occasions.',
    imageUrl: 'https://images.printify.com/5a1d74e1b8e7e30d1f3496c3',
    providers: [
      { id: 1, name: 'Print Provider 1', price: 22.00 },
      { id: 4, name: 'Printify Express', price: 24.50 },
    ],
    variants: [
        { id: 1, name: 'Color', options: [
            { value: 'Black', hex: '#000000' }, { value: 'White', hex: '#FFFFFF' },
            { value: 'Navy', hex: '#0a1d3d' }, { value: 'Sport Grey', hex: '#a3a3a3' },
            { value: 'Red', hex: '#c41c2b' },
        ]},
    ]
  },
  {
    id: 301,
    name: 'Ceramic Mug 11oz',
    type: 'Mug',
    description: 'A classic ceramic mug for your favorite beverage.',
    imageUrl: 'https://images.printify.com/5b21118b0373330f2f36d18a',
    providers: [
      { id: 5, name: 'District Photo', price: 4.50 },
      { id: 6, name: 'SPOKE Custom Products', price: 5.10 },
    ],
    variants: [
        { id: 1, name: 'Color', options: [
            { value: 'White', hex: '#FFFFFF' },
        ]},
    ]
  },
];
