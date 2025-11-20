import { ProductBlueprint } from '../types.ts';
import { productCatalog } from '../data/catalog.ts';

/**
 * NOTE: In a production environment, all Printify API requests must be routed 
 * through a backend proxy (e.g., /api/proxy) to handle CORS and protect API keys.
 * 
 * Since this application is running in a client-side environment without a 
 * dedicated backend proxy, direct calls to 'https://api.printify.com' will fail 
 * due to CORS restrictions.
 * 
 * Therefore, this service currently returns MOCK DATA from 'data/catalog.ts' 
 * to demonstrate functionality without needing a live backend.
 */

const SIMULATED_DELAY_MS = 800;

/**
 * Tests the connection to Printify.
 * Simulates a successful connection for demonstration purposes.
 */
export const testPrintifyConnection = async (apiKey: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));

    if (!apiKey || apiKey.trim() === '') {
        throw new Error('Printify API key is required.');
    }

    // In a real application, you would fetch /shops.json here.
    return 'Connection successful! (Mocked for Demo)';
};

/**
 * Fetches the product catalog.
 * Returns mock data to bypass CORS restrictions in the demo environment.
 */
export const fetchPrintifyCatalog = async (apiKey: string): Promise<ProductBlueprint[]> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));

    if (!apiKey || apiKey.trim() === '') {
         throw new Error('Printify API Key is missing. Please configure it in Settings.');
    }

    // Return the static catalog data
    return productCatalog;
};