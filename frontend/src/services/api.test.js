import { describe, test, expect } from 'vitest';
import { inventoryApi, forecastingApi } from './api';

describe('API Service', () => {
    test('inventoryApi methods are defined', () => {
        expect(inventoryApi.getProducts).toBeDefined();
        expect(inventoryApi.getProduct).toBeDefined();
        expect(inventoryApi.getSalesTrends).toBeDefined();
        expect(inventoryApi.getABCAnalysis).toBeDefined();
    });

    test('forecastingApi methods are defined', () => {
        expect(forecastingApi.predict).toBeDefined();
        expect(forecastingApi.batchStatus).toBeDefined();
    });
});
