
import { ProductBlueprint } from '../types.ts';

// Helper for variants
const generateVariants = () => [
    { id: 1, title: 'White / M', color: 'White', hex: '#FFFFFF', size: 'M' },
    { id: 2, title: 'Black / M', color: 'Black', hex: '#000000', size: 'M' },
    { id: 3, title: 'Navy / M', color: 'Navy', hex: '#0a1d3d', size: 'M' },
    { id: 4, title: 'Red / M', color: 'Red', hex: '#c41c2b', size: 'M' },
    { id: 5, title: 'Royal Blue / M', color: 'Royal Blue', hex: '#1667be', size: 'M' },
    { id: 6, title: 'Sport Grey / M', color: 'Sport Grey', hex: '#a3a3a3', size: 'M' },
    { id: 7, title: 'Dark Heather / M', color: 'Dark Heather', hex: '#464646', size: 'M' },
    { id: 8, title: 'Pink / M', color: 'Pink', hex: '#ffabc9', size: 'M' },
];

export const productCatalog: ProductBlueprint[] = [
  {
    id: 3001,
    name: 'Unisex Jersey Short Sleeve Tee',
    brand: 'Bella+Canvas 3001',
    category: 'T-Shirt',
    description: 'This classic unisex jersey short sleeve tee fits like a well-loved favorite. Soft cotton and quality print make users fall in love with it over and over again.',
    imageUrl: 'https://images.printify.com/5a285a21b8e7e36577416307',
    variants: generateVariants(),
    providers: [
      { 
          id: 1, 
          name: 'Monster Digital', 
          location: 'USA', 
          itemPrice: 9.86, 
          shippingPrice: 4.75, 
          avgProductionTime: 1.2, 
          colors: ['#FFFFFF', '#000000', '#0a1d3d', '#c41c2b', '#a3a3a3', '#464646'],
          rating: 4.9 
      },
      { 
          id: 2, 
          name: 'SwiftPOD', 
          location: 'USA', 
          itemPrice: 10.50, 
          shippingPrice: 5.10, 
          avgProductionTime: 2.0, 
          colors: ['#FFFFFF', '#000000', '#0a1d3d', '#c41c2b', '#1667be', '#a3a3a3', '#ffabc9'],
          rating: 4.7 
      },
      { 
          id: 3, 
          name: 'Printify Choice', 
          location: 'Global', 
          itemPrice: 9.40, 
          shippingPrice: 4.50, 
          avgProductionTime: 1.8, 
          colors: ['#FFFFFF', '#000000', '#0a1d3d'],
          rating: 4.6 
      },
    ]
  },
  {
    id: 5000,
    name: 'Unisex Heavy Cotton Tee',
    brand: 'Gildan 5000',
    category: 'T-Shirt',
    description: 'The unisex heavy cotton tee is the basic staple of any wardrobe. It is the foundation upon which casual fashion grows.',
    imageUrl: 'https://images.printify.com/5853ca70a1822c08046d651e',
    variants: generateVariants(),
    providers: [
        { 
            id: 4, 
            name: 'MyLocker', 
            location: 'USA', 
            itemPrice: 7.99, 
            shippingPrice: 5.50, 
            avgProductionTime: 2.3, 
            colors: ['#FFFFFF', '#000000', '#0a1d3d', '#c41c2b', '#1667be'],
            rating: 4.5 
        },
        { 
            id: 1, 
            name: 'Monster Digital', 
            location: 'USA', 
            itemPrice: 8.50, 
            shippingPrice: 4.75, 
            avgProductionTime: 1.1, 
            colors: ['#FFFFFF', '#000000', '#0a1d3d', '#c41c2b', '#a3a3a3'],
            rating: 4.9 
        },
    ]
  },
  {
    id: 18500,
    name: 'Unisex Heavy Blend Hooded Sweatshirt',
    brand: 'Gildan 18500',
    category: 'Hoodie',
    description: 'A cozy, no-nonsense hoodie to keep you warm. 50% cotton, 50% polyester.',
    imageUrl: 'https://images.printify.com/5a1d74e1b8e7e30d1f3496c3',
    variants: generateVariants(),
    providers: [
      { 
          id: 2, 
          name: 'SwiftPOD', 
          location: 'USA', 
          itemPrice: 22.50, 
          shippingPrice: 8.50, 
          avgProductionTime: 2.5, 
          colors: ['#FFFFFF', '#000000', '#0a1d3d', '#a3a3a3'],
          rating: 4.7 
      },
      { 
          id: 5, 
          name: 'Fifth Sun', 
          location: 'USA', 
          itemPrice: 21.80, 
          shippingPrice: 7.99, 
          avgProductionTime: 3.0, 
          colors: ['#000000', '#a3a3a3'],
          rating: 4.4 
      },
    ]
  },
  {
    id: 8888,
    name: 'Accent Coffee Mug, 11oz',
    brand: 'Generic',
    category: 'Mug',
    description: 'Add some color to your routine with this two-tone, custom accent coffee mug.',
    imageUrl: 'https://images.printify.com/5b21118b0373330f2f36d18a',
    variants: [{ id: 99, title: 'White', color: 'White', hex: '#FFFFFF', size: '11oz' }],
    providers: [
      { 
          id: 6, 
          name: 'District Photo', 
          location: 'USA', 
          itemPrice: 5.50, 
          shippingPrice: 6.00, 
          avgProductionTime: 2.0, 
          colors: ['#FFFFFF', '#c41c2b', '#000000'],
          rating: 4.6 
      },
    ]
  },
  {
    id: 9000,
    name: 'Spun Polyester Square Pillow',
    brand: 'Generic',
    category: 'Home & Living',
    description: 'Room accents shouldn\'t be underrated. These beautiful indoor pillows serve as statement pieces.',
    imageUrl: 'https://images.printify.com/5a391e4f0373331067064220',
    variants: [],
    providers: [
      { 
          id: 7, 
          name: 'MWW On Demand', 
          location: 'USA', 
          itemPrice: 14.50, 
          shippingPrice: 6.00, 
          avgProductionTime: 3.0, 
          colors: ['#FFFFFF'],
          rating: 4.8 
      },
    ]
  }
];
