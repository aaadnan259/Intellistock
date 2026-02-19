import { describe, test, expect, vi, beforeEach, beforeAll } from 'vitest';

// Use vi.hoisted to hoist the mockApi creation so it's available for vi.mock
const { mockApi } = vi.hoisted(() => {
    const mock = vi.fn(() => Promise.resolve({ data: {} }));
    mock.interceptors = {
        response: {
            use: vi.fn(),
        },
    };
    mock.get = vi.fn();
    mock.post = vi.fn();
    return { mockApi: mock };
});

vi.mock('axios', () => ({
    default: {
        create: vi.fn(() => mockApi),
    },
}));

// Now import the module under test
import api, { inventoryApi, forecastingApi } from './api';

describe('API Service', () => {
    // Existing tests
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

    describe('Retry Logic', () => {
        let errorHandler;

        beforeAll(() => {
            // Get the error handler from the interceptor
            // api.interceptors.response.use(successHandler, errorHandler)
            // We want the second argument of the first call (or the only call)
            if (mockApi.interceptors.response.use.mock.calls.length === 0) {
                throw new Error('Interceptor not registered. mockApi.interceptors.response.use was not called.');
            }
            errorHandler = mockApi.interceptors.response.use.mock.calls[0][1];
        });

        beforeEach(() => {
            mockApi.mockClear();
        });

        test('should not retry if config is missing', async () => {
            const error = { response: { status: 500 } }; // Missing config
            await expect(errorHandler(error)).rejects.toEqual(error);
            expect(mockApi).not.toHaveBeenCalled();
        });

        test('should not retry if retry count exceeded', async () => {
            const error = {
                config: { _retryCount: 3 },
                response: { status: 500 }
            };
            await expect(errorHandler(error)).rejects.toEqual(error);
            expect(mockApi).not.toHaveBeenCalled();
        });

        test('should not retry on 4xx errors', async () => {
             const error = {
                config: { _retryCount: 0 },
                response: { status: 404 }
            };
            await expect(errorHandler(error)).rejects.toEqual(error);
            expect(mockApi).not.toHaveBeenCalled();
        });

         test('should retry on network error (no response)', async () => {
            vi.useFakeTimers();
            const error = {
                config: { _retryCount: 0 },
                // No response property implies network error
            };

            // The handler returns a promise that resolves when the retry happens
            const retryPromise = errorHandler(error);

            // Advance timers to trigger the retry
            // First retry delay is 1000ms
            await vi.advanceTimersByTimeAsync(1000);

            await retryPromise;

            expect(mockApi).toHaveBeenCalledTimes(1);
            expect(error.config._retryCount).toBe(1);

            vi.useRealTimers();
        });

        test('should retry on 5xx server error', async () => {
            vi.useFakeTimers();
            const error = {
                config: { _retryCount: 0 },
                response: { status: 503 }
            };

            const retryPromise = errorHandler(error);
            await vi.advanceTimersByTimeAsync(1000);
            await retryPromise;

            expect(mockApi).toHaveBeenCalledTimes(1);
            expect(error.config._retryCount).toBe(1);
            vi.useRealTimers();
        });

        test('should implement exponential backoff', async () => {
            vi.useFakeTimers();

            // 1st retry
            let error = { config: { _retryCount: 0 } };
            let retryPromise = errorHandler(error);
            // Should verify delay is 1000ms.
            // If I advance 999ms, it should not have called yet.
            await vi.advanceTimersByTimeAsync(999);
            expect(mockApi).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1);
            await retryPromise;
            expect(mockApi).toHaveBeenCalledTimes(1);
            expect(error.config._retryCount).toBe(1);

            // 2nd retry
            mockApi.mockClear();
            error = { config: { _retryCount: 1 } }; // _retryCount is 1, so next is 2
            // logic: count incremented to 2. delay = 1000 * 2^(2-1) = 2000
            retryPromise = errorHandler(error);
            await vi.advanceTimersByTimeAsync(1999);
            expect(mockApi).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1);
            await retryPromise;
            expect(mockApi).toHaveBeenCalledTimes(1);

             // 3rd retry
            mockApi.mockClear();
            error = { config: { _retryCount: 2 } }; // _retryCount is 2, next is 3
            // logic: count incremented to 3. delay = 1000 * 2^(3-1) = 4000
            retryPromise = errorHandler(error);
            await vi.advanceTimersByTimeAsync(3999);
            expect(mockApi).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(1);
            await retryPromise;
            expect(mockApi).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });
});
