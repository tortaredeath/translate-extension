/**
 * Jest Setup - Chrome API Mock
 */

// Mock chrome.storage.local
const mockStorage = {};

const createStorageMock = () => ({
  get: jest.fn((keys) => {
    return new Promise((resolve) => {
      if (typeof keys === 'string') {
        resolve({ [keys]: mockStorage[keys] });
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
        resolve(result);
      } else {
        resolve({ ...mockStorage });
      }
    });
  }),
  set: jest.fn((items) => {
    return new Promise((resolve) => {
      Object.assign(mockStorage, items);
      resolve();
    });
  }),
  remove: jest.fn((keys) => {
    return new Promise((resolve) => {
      if (typeof keys === 'string') {
        delete mockStorage[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(key => delete mockStorage[key]);
      }
      resolve();
    });
  }),
  clear: jest.fn(() => {
    return new Promise((resolve) => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
      resolve();
    });
  })
});

// Mock chrome.runtime
const createRuntimeMock = () => ({
  id: 'test-extension-id',
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  lastError: null
});

// Global chrome mock
global.chrome = {
  storage: {
    local: createStorageMock()
  },
  runtime: createRuntimeMock()
};

// Helper to reset storage between tests
global.resetMockStorage = () => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
};

// Helper to set mock storage data
global.setMockStorage = (data) => {
  Object.assign(mockStorage, data);
};

// Helper to get mock storage data
global.getMockStorage = () => ({ ...mockStorage });

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.resetMockStorage();
});
