// client/src/types/PropertyTypes.ts
// consolidated PropertyType.ts
export interface PropertyType {
  // Core identifiers
  id: number;                    // From PropertyType (equivalent to propertyId)
  
  // Location and property details
  formattedAddress: string;      // From both
  propertyType: string;          // From PropertyType (equivalent to type)
  bedrooms: number;              // From PropertyType (equivalent to beds)
  bathrooms: number;             // From PropertyType (equivalent to bath)
  squareFootage: number;         // From both
  yearBuilt: number;             // From both
  
  // Financial history
  lastSale: string;              // From DbProperty
 
  lastSalePrice: number;         // From both
  
  // Value estimate
  priceRangeLow?: number;        // From PropertyType only
  priceRangeHigh?: number;       // From PropertyType only
  price?: number;                // From PropertyType only
  
  // Monthly financials
  monthlyRent?: number;          // From both (optional)
  mortgagePayment: number;       // From both
  mortgageBalance: number;       // From both
  hoaPayment: number;            // From both
  interestRate: number;          // From both
  
  // Media and notes
  image?: string;                // From PropertyType        // From DbProperty (potentially same as image)
  notes: string;                 // From both
}
