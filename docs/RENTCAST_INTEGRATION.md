# RentCast API Integration Guide

## Overview

This document provides a step-by-step guide for integrating the RentCast API into our FinSight application, based on our previous implementation. The RentCast API allows us to fetch real estate property data including property details and value estimates.

## Implementation Steps

### 1. Set Up the RentCast Service

#### 1.1 Create a dedicated service class for RentCast API calls

```typescript
// client/src/lib/rentcast-service.ts

// Define the cache interface
interface RentCastCache {
  data: any;
  timestamp: number;
  endpoint: string;
}

// Define property details interface
interface PropertyDetails {
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  latitude?: number;
  longitude?: number;
}

// Define address interface
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// API Base URL and key configuration
const RENTCAST_BASE_URL = 'https://api.rentcast.io/v1';

// Split the API key into parts for security
const key1 = '944a2ff95';
const key2 = 'e3b4b1db10';
const key3 = '831e1920574df';
const RENTCAST_API_KEY = `${key1}${key2}${key3}`;

// Create the service class
export class RentCastService {
  private cache: Map<string, RentCastCache>;
  private lastCallTimestamp: Record<string, number>;
  private monthlyCallCount: number;
  private readonly MONTHLY_LIMIT = 50;
  private readonly CALL_COOLDOWN = 2 * 1000; // 2 seconds between calls
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.cache = new Map();
    this.lastCallTimestamp = {};
    this.monthlyCallCount = 0;

    if (typeof window !== 'undefined') {
      this.loadStoredData();
    }
  }

  // Methods will be added below...
}

// Create a singleton instance
export const rentcastService = new RentCastService();
```

#### 1.2 Implement caching to minimize API calls

```typescript
// Add these methods to the RentCastService class

private loadStoredData() {
  try {
    const savedCache = localStorage.getItem('rentcast_cache');
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      this.cache = new Map(Object.entries(parsed));
    }

    const metrics = localStorage.getItem('rentcast_metrics');
    if (metrics) {
      const { lastCalls, monthlyCount } = JSON.parse(metrics);
      this.lastCallTimestamp = lastCalls || {};
      this.monthlyCallCount = monthlyCount || 0;
    }

    this.checkAndResetMonthlyCount();
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
}

private checkAndResetMonthlyCount() {
  const lastCallDate = new Date(this.lastCallTimestamp[Object.keys(this.lastCallTimestamp)[0]] || 0);
  const currentDate = new Date();

  if (lastCallDate.getMonth() !== currentDate.getMonth() ||
      lastCallDate.getFullYear() !== currentDate.getFullYear()) {
    this.monthlyCallCount = 0;
    this.saveMetrics();
  }
}

private saveCache() {
  if (typeof window === 'undefined') return;
  try {
    const cacheObject = Object.fromEntries(this.cache);
    localStorage.setItem('rentcast_cache', JSON.stringify(cacheObject));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

private saveMetrics() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('rentcast_metrics', JSON.stringify({
      lastCalls: this.lastCallTimestamp,
      monthlyCount: this.monthlyCallCount
    }));
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
}

private getCachedItem(key: string): any | null {
  const cached = this.cache.get(key);

  if (!cached) return null;

  // Check if the cache has expired
  if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
    this.cache.delete(key);
    this.saveCache();
    return null;
  }

  return cached.data;
}

private cacheItem(key: string, data: any): void {
  this.cache.set(key, {
    data,
    timestamp: Date.now(),
    endpoint: key.split(':')[0]
  });

  this.saveCache();
}
```

#### 1.3 Add rate limiting to avoid exceeding API quotas

```typescript
// Add this method to the RentCastService class

private canMakeCall(endpoint: string): { allowed: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return {
      allowed: false,
      reason: 'API calls can only be made in the browser'
    };
  }

  if (!RENTCAST_API_KEY) {
    return {
      allowed: false,
      reason: 'RentCast API key is not configured'
    };
  }

  const now = Date.now();

  if (this.monthlyCallCount >= this.MONTHLY_LIMIT) {
    return {
      allowed: false,
      reason: `Monthly API limit reached (${this.MONTHLY_LIMIT} calls)`
    };
  }

  const lastCall = this.lastCallTimestamp[endpoint] || 0;
  if (now - lastCall < this.CALL_COOLDOWN) {
    const waitTime = Math.ceil((this.CALL_COOLDOWN - (now - lastCall)) / 1000);
    return {
      allowed: false,
      reason: `Please wait ${waitTime} seconds between calls to ${endpoint}`
    };
  }

  return { allowed: true };
}
```

#### 1.4 Provide methods for different API endpoints

```typescript
// Add this method to the RentCastService class to make API calls

private async makeApiCall(endpoint: string, params: Record<string, string>): Promise<any> {
  const checkCall = this.canMakeCall(endpoint);
  if (!checkCall.allowed) {
    throw new Error(checkCall.reason);
  }

  // Debug log to see what parameters we're sending
  console.log('Making API call with params:', params);

  // Build the query string with properly encoded parameters
  const queryString = Object.entries(params)
    .map(([key, value]) => {
      // Don't encode the address parameter since we've already formatted it
      if (key === 'address') {
        return `${key}=${value}`;
      }
      // Encode other parameters normally
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  const url = `${RENTCAST_BASE_URL}${endpoint}?${queryString}`;

  // Debug log to see the final URL
  console.log('Calling RentCast API:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': RENTCAST_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RentCast API error:', {
        endpoint,
        params,
        status: response.status,
        statusText: response.statusText,
        errorText,
        url
      });
      throw new Error(`RentCast API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Update metrics only after successful call
    this.lastCallTimestamp[endpoint] = Date.now();
    this.monthlyCallCount++;
    this.saveMetrics();

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

### 2. Address Handling

#### 2.1 Standardize address format

```typescript
// Add these methods to the RentCastService class

private formatAddress(address: string | Address): string {
  // If address is a string, format it
  if (typeof address === 'string') {
    // Address should already be in format: "Street,City,State,ZIP"
    // Just ensure spaces within each part are replaced with plus signs
    const parts = address.split(',');
    if (parts.length !== 4) {
      console.warn('Address format incorrect. Expected "Street,City,State,ZIP"');
      return address;
    }
    // Replace spaces with plus signs within each part, but keep the commas
    return parts.map(part => part.trim().replace(/\s+/g, '+')).join(',');
  }

  // If address is an Address object, format it
  const { street, city, state, zipCode } = address;
  return `${street.trim().replace(/\s+/g, '+')},${city.trim()},${state.trim()},${zipCode.trim()}`;
}

// Helper function to create a properly formatted address string
public static createAddressString(
  street: string,
  city: string,
  state: string,
  zipCode: string
): string {
  return `${street},${city},${state},${zipCode}`;
}
```

#### 2.2 Implement proper encoding for API requests

```typescript
// Add this method to the RentCastService class

private buildQueryParams(address: string | Address, params: any = {}): Record<string, string> {
  const formattedAddress = this.formatAddress(address);
  console.log('Formatted address for API:', formattedAddress);

  // Properly encode the address for the URL
  const encodedAddress = encodeURIComponent(formattedAddress.replace(/\+/g, ' '));

  const queryParams: Record<string, string> = {
    address: encodedAddress
  };

  // Add required property details - these are REQUIRED for AVM
  if (params.propertyType) queryParams.propertyType = encodeURIComponent(params.propertyType);
  if (params.bedrooms) queryParams.bedrooms = params.bedrooms.toString();
  if (params.bathrooms) queryParams.bathrooms = params.bathrooms.toString();
  if (params.squareFootage) queryParams.squareFootage = params.squareFootage.toString();

  // Add optional parameters
  if (params.latitude) queryParams.latitude = params.latitude.toString();
  if (params.longitude) queryParams.longitude = params.longitude.toString();
  if (params.maxRadius !== undefined) queryParams.maxRadius = params.maxRadius.toString();
  if (params.daysOld !== undefined) queryParams.daysOld = params.daysOld.toString();
  if (params.compCount !== undefined) queryParams.compCount = params.compCount.toString();

  return queryParams;
}
```

#### 2.3 Create utility functions for address formatting

```typescript
// Add these helper utilities for working with addresses

// Function to validate address format
public validateAddress(address: string): boolean {
  const parts = address.split(',');
  if (parts.length !== 4) {
    console.warn('Address format incorrect. Expected "Street,City,State,ZIP"');
    return false;
  }
  return true;
}

// Function to parse address string into components
public parseAddress(address: string): Address | null {
  const parts = address.split(',');
  if (parts.length !== 4) {
    console.warn('Address format incorrect. Expected "Street,City,State,ZIP"');
    return null;
  }

  return {
    street: parts[0].trim(),
    city: parts[1].trim(),
    state: parts[2].trim(),
    zipCode: parts[3].trim()
  };
}

// Function to extract just the street address for display
public static getStreetAddress(address: string): string {
  const parts = address.split(',');
  return parts[0].trim();
}
```

### 3. API Key Management

#### 3.1 Store the API key securely

```typescript
// In client/src/lib/rentcast-service.ts

// Store the API key in environment variables if possible
// For development, you can use a .env file:
// RENTCAST_API_KEY=your_api_key_here

// For production, use environment variables on your hosting platform

// Then access it like this:
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || '';

// Alternatively, for client-side only applications, you can use:
const RENTCAST_API_KEY = import.meta.env.VITE_RENTCAST_API_KEY || '';
```

#### 3.2 Split the key into parts to avoid exposing it directly in the code

```typescript
// A more secure way to store the API key in client-side code
// This makes it harder to extract from bundled code

// Split key into parts (use your actual key)
const key1 = '944a2ff95';
const key2 = 'e3b4b1db10';
const key3 = '831e1920574df';

// Combine at runtime
const RENTCAST_API_KEY = `${key1}${key2}${key3}`;

// Check if key is available before making API calls
private isApiKeyAvailable(): boolean {
  if (!RENTCAST_API_KEY) {
    console.error('RentCast API key is not configured');
    return false;
  }
  return true;
}
```

#### 3.3 Implement a secure key validation function

```typescript
// Add this method to validate API key without exposing it

private validateApiKey(): boolean {
  // Key should be at least 20 characters
  if (!RENTCAST_API_KEY || RENTCAST_API_KEY.length < 20) {
    console.error('Invalid RentCast API key format');
    return false;
  }

  // Additional validation could be added here

  return true;
}

// Example of using the validation
public async getProperty(address: string | Address, forceRefresh = false): Promise<any> {
  if (!this.validateApiKey()) {
    throw new Error('API key validation failed');
  }

  // Rest of the method implementation...
}
```

### 4. Cache Implementation

#### 4.1 Create a cache system with a 7-day expiration

```typescript
// In client/src/lib/rentcast-service.ts

// Define the cache constants
private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache structure
interface RentCastCache {
  data: any;
  timestamp: number;
  endpoint: string;
}

// Initialize cache in constructor
constructor() {
  this.cache = new Map<string, RentCastCache>();
  this.lastCallTimestamp = {};
  this.monthlyCallCount = 0;

  if (typeof window !== 'undefined') {
    this.loadStoredData();
  }
}
```

#### 4.2 Store cache in localStorage for persistence

```typescript
// Add these methods to RentCastService

// Save cache to localStorage
private saveCache() {
  if (typeof window === 'undefined') return;
  try {
    const cacheObject = Object.fromEntries(this.cache);
    localStorage.setItem('rentcast_cache', JSON.stringify(cacheObject));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Load cache from localStorage
private loadStoredData() {
  try {
    const savedCache = localStorage.getItem('rentcast_cache');
    if (savedCache) {
      const parsed = JSON.parse(savedCache);
      this.cache = new Map(Object.entries(parsed));
    }

    const metrics = localStorage.getItem('rentcast_metrics');
    if (metrics) {
      const { lastCalls, monthlyCount } = JSON.parse(metrics);
      this.lastCallTimestamp = lastCalls || {};
      this.monthlyCallCount = monthlyCount || 0;
    }

    this.checkAndResetMonthlyCount();
  } catch (error) {
    console.error('Error loading stored data:', error);
    // Initialize with empty cache if there's an error
    this.cache = new Map();
    this.lastCallTimestamp = {};
    this.monthlyCallCount = 0;
  }
}
```

#### 4.3 Implement cache invalidation logic

```typescript
// Add these methods to RentCastService

// Check if a cached item is still valid
private getCachedItem(key: string): any | null {
  const cached = this.cache.get(key);

  if (!cached) return null;

  // Check if the cache has expired
  if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
    this.cache.delete(key);
    this.saveCache();
    return null;
  }

  return cached.data;
}

// Store an item in the cache
private cacheItem(key: string, data: any): void {
  this.cache.set(key, {
    data,
    timestamp: Date.now(),
    endpoint: key.split(':')[0]
  });

  this.saveCache();
}

// Remove expired items from cache
private cleanupCache(): void {
  const now = Date.now();
  let hasChanges = false;

  for (const [key, value] of this.cache.entries()) {
    if (now - value.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    this.saveCache();
  }
}
```

#### 4.4 Add force refresh options for manual updates

```typescript
// Example of implementing force refresh in a method

/**
 * Get property details from the API
 * @param address Property address
 * @param propertyDetails Additional property details
 * @param forceRefresh Whether to bypass cache and force a fresh API call
 */
public async getPropertyDetails(
  address: string | Address,
  propertyDetails: PropertyDetails = {},
  forceRefresh = false
): Promise<any> {
  const endpoint = '/properties';
  const cacheKey = `${endpoint}:${typeof address === 'string' ? address : this.formatAddress(address)}`;

  // Check cache unless forceRefresh is true
  if (!forceRefresh) {
    const cached = this.getCachedItem(cacheKey);
    if (cached) {
      console.log('Using cached property details');
      return cached;
    }
  }

  const params = this.buildQueryParams(address, propertyDetails);

  try {
    const data = await this.makeApiCall(endpoint, params);

    // Cache the result unless forceRefresh was requested
    if (!forceRefresh) {
      this.cacheItem(cacheKey, data);
    }

    return data;
  } catch (error) {
    console.error('Error getting property details:', error);
    throw error;
  }
}

// Add a method to clear the cache manually
public clearCache(): void {
  this.cache.clear();
  this.saveCache();
  console.log('Cache cleared');
}
```

### 5. Error Handling

#### 5.1 Implement comprehensive error catching and reporting

```typescript
// In client/src/lib/rentcast-service.ts

// Enhanced API call method with proper error handling
private async makeApiCall(endpoint: string, params: Record<string, string>): Promise<any> {
  const checkCall = this.canMakeCall(endpoint);
  if (!checkCall.allowed) {
    throw new Error(checkCall.reason);
  }

  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${RENTCAST_BASE_URL}${endpoint}?${queryString}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': RENTCAST_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Detailed error handling
      const errorText = await response.text();
      let errorMessage = '';

      try {
        // Try to parse error as JSON
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        // If not JSON, use text directly
        errorMessage = errorText;
      }

      // Log detailed error information
      console.error('RentCast API error:', {
        endpoint,
        params,
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        url
      });

      // Throw specific error types based on status code
      if (response.status === 401) {
        throw new Error('RentCast API: Authentication failed. Invalid API key.');
      } else if (response.status === 403) {
        throw new Error('RentCast API: Access forbidden. Check API key permissions.');
      } else if (response.status === 404) {
        throw new Error('RentCast API: Property not found or invalid address format.');
      } else if (response.status === 429) {
        throw new Error('RentCast API: Rate limit exceeded. Try again later.');
      } else {
        throw new Error(`RentCast API error (${response.status}): ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Update metrics only after successful call
    this.lastCallTimestamp[endpoint] = Date.now();
    this.monthlyCallCount++;
    this.saveMetrics();

    return data;
  } catch (error) {
    // Handle fetch errors (network issues)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error connecting to RentCast API:', error);
      throw new Error('Network error: Unable to connect to RentCast API. Check your internet connection.');
    }

    // Re-throw other errors
    throw error;
  }
}
```

#### 5.2 Create user-friendly error messages

```typescript
// Custom error class for RentCast-specific errors
export class RentCastError extends Error {
  public readonly status?: number;
  public readonly endpoint?: string;
  public readonly userMessage: string;

  constructor(message: string, userMessage?: string, status?: number, endpoint?: string) {
    super(message);
    this.name = 'RentCastError';
    this.status = status;
    this.endpoint = endpoint;
    this.userMessage = userMessage || 'An error occurred with the property data service.';
  }
}

// Update makeApiCall to use the custom error class
private async makeApiCall(endpoint: string, params: Record<string, string>): Promise<any> {
  // ... existing code ...

  if (!response.ok) {
    // ... existing error parsing ...

    // Throw custom error with user-friendly message
    let userMessage = '';
    if (response.status === 401) {
      userMessage = 'Unable to authenticate with the property service.';
    } else if (response.status === 403) {
      userMessage = 'Access to property data is restricted.';
    } else if (response.status === 404) {
      userMessage = 'Property not found. Please check the address and try again.';
    } else if (response.status === 429) {
      userMessage = 'Property service is temporarily unavailable due to high demand. Please try again later.';
    } else {
      userMessage = 'An error occurred while retrieving property data.';
    }

    throw new RentCastError(
      `RentCast API error (${response.status}): ${errorMessage}`,
      userMessage,
      response.status,
      endpoint
    );
  }

  // ... rest of method ...
}
```

#### 5.3 Add detailed console logging for debugging

```typescript
// Add this utility method for consistent logging
private logError(
  message: string,
  error: any,
  additionalInfo?: Record<string, any>
): void {
  // Format for consistent error logging
  console.error(`RentCast API Error: ${message}`, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    ...(additionalInfo || {})
  });
}

// Example usage in a method
public async getValueEstimate(address: string | Address, propertyDetails: PropertyDetails = {}): Promise<any> {
  try {
    // Method implementation...
  } catch (error) {
    this.logError('Failed to get value estimate', error, {
      address: typeof address === 'string' ? address : this.formatAddress(address),
      propertyDetails
    });
    throw error;
  }
}

// Add debug logging that can be enabled/disabled
private debug = false;

public enableDebugLogging(enable = true): void {
  this.debug = enable;
  console.log(`RentCast debug logging ${enable ? 'enabled' : 'disabled'}`);
}

private log(...args: any[]): void {
  if (this.debug) {
    console.log('[RentCast]', ...args);
  }
}
```

### 6. UI Integration

#### 6.1 Create loading states for API calls

```tsx
// Example component using the RentCast service
// client/src/components/PropertyDetails.tsx

import { useState, useEffect } from 'react';
import { rentcastService } from '@/lib/rentcast-service';

interface PropertyDetailsProps {
  address: string;
}

export function PropertyDetails({ address }: PropertyDetailsProps) {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPropertyData() {
      try {
        setLoading(true);
        setError(null);

        const data = await rentcastService.getPropertyDetails(address, {
          propertyType: 'Single Family', // These values could come from a form or default values
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 1500,
        });

        setProperty(data);
      } catch (err) {
        console.error('Error loading property:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load property data'
        );
      } finally {
        setLoading(false);
      }
    }

    loadPropertyData();
  }, [address]);

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 border rounded">
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        {error}
      </div>
    );
  }

  // Show property data
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-semibold">{property.formattedAddress}</h2>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm text-gray-500">Property Type</p>
          <p>{property.propertyType}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Estimated Value</p>
          <p>${property.price?.toLocaleString() || 'N/A'}</p>
        </div>
        {/* More property details... */}
      </div>
    </div>
  );
}
```

#### 6.2 Display error messages when API calls fail

```tsx
// Component for displaying user-friendly error messages
// client/src/components/PropertyError.tsx

import { RentCastError } from '@/lib/rentcast-service';

interface PropertyErrorProps {
  error: Error | unknown;
  onRetry?: () => void;
}

export function PropertyError({ error, onRetry }: PropertyErrorProps) {
  // Get appropriate error message
  let errorMessage = 'An unexpected error occurred.';

  if (error instanceof RentCastError) {
    // Use the user-friendly message from RentCastError
    errorMessage = error.userMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-red-500 mt-0.5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="text-sm font-medium text-red-800">
            Error Loading Property Data
          </h3>
          <p className="mt-1 text-sm text-red-700">{errorMessage}</p>

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 6.3 Add refresh functionality for manual data updates

```tsx
// Example of a component with refresh functionality
// client/src/components/PropertyView.tsx

import { useState } from 'react';
import { PropertyDetails } from './PropertyDetails';
import { PropertyError } from './PropertyError';
import { rentcastService } from '@/lib/rentcast-service';

interface PropertyViewProps {
  address: string;
}

export function PropertyView({ address }: PropertyViewProps) {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPropertyData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Use force refresh option
      const data = await rentcastService.getPropertyDetails(
        address,
        {
          propertyType: 'Single Family',
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 1500,
        },
        forceRefresh
      );

      setProperty(data);
    } catch (err) {
      console.error('Error loading property:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to load property data')
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPropertyData();
  }, [address]);

  // Handle refresh button click
  const handleRefresh = () => {
    loadPropertyData(true); // Force refresh
  };

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Property Details</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </span>
          ) : (
            'Refresh Data'
          )}
        </button>
      </div>

      {error ? (
        <PropertyError error={error} onRetry={handleRefresh} />
      ) : (
        <PropertyDetails
          address={address}
          property={property}
          loading={loading}
        />
      )}
    </div>
  );
}
```

#### 6.4 Implement a tabbed interface for multiple properties

```tsx
// Example of a tabbed interface for multiple properties
// client/src/components/PropertyList.tsx

import { useState, useEffect } from 'react';
import { PropertyView } from './PropertyView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home } from 'lucide-react';

// Sample properties
const PROPERTIES = [
  '179 S 229th Dr,Buckeye,AZ,85326',
  '26124 W Burnett Rd,Buckeye,AZ,85396',
  '23009 W Cocopah St,Buckeye,AZ,85326',
];

// Helper function to format address for display
function formatAddressForTab(address: string) {
  const parts = address.split(',');
  return parts[0].trim(); // Return just the street address
}

export function PropertyList() {
  const [activeProperty, setActiveProperty] = useState(PROPERTIES[0]);

  return (
    <div className="border rounded p-6">
      <h2 className="text-2xl font-bold mb-4">Properties</h2>

      <Tabs
        value={activeProperty}
        onValueChange={setActiveProperty}
        className="space-y-4">
        <TabsList>
          {PROPERTIES.map((address) => (
            <TabsTrigger
              key={address}
              value={address}
              className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {formatAddressForTab(address)}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROPERTIES.map((address) => (
          <TabsContent key={address} value={address}>
            <PropertyView address={address} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
```

## Implementation Details

### RentCast Service Class

```

```
