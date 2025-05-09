import { z } from 'zod';

const PropertySchema = z.object({
  formattedAddress: z.string(),
  propertyType: z.string().optional().default('Single Family'),
  bedrooms: z.number().optional().default(0),
  bathrooms: z.number().optional().default(0),
  squareFootage: z.number().optional().default(0),
  yearBuilt: z.number().optional().default(0),
  lastSale: z.string().optional().default(''),
  lastSalePrice: z.number().optional().default(0),
  priceRangeLow: z.number().optional().default(0),
  price: z.number().optional().default(0),
  priceRangeHigh: z.number().optional(),
  lastUpdated: z
    .number()
    .optional()
    .default(() => Date.now()),
});

type PropertyData = z.infer<typeof PropertySchema>;

export async function getPropertyDetails(
  address: string
): Promise<PropertyData> {
  try {
    const propertyData = await fetchPropertyDetails(address);

    //Value data is the data needed for the RentCast valuation API
    let valueData = null;
    try {
      valueData = await fetchPropertyValue(address, {
        propertyType: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        squareFootage: propertyData.squareFootage,
      });
    } catch (error) {
      console.error('Error fetching property value:', error);
    }
    // Returning the normal property data and the value data - if it exists.
    return {
      ...propertyData,
      ...(valueData
        ? {
            priceRangeLow: valueData.priceRangeLow || 0,
            price: valueData.price || 0,
            priceRangeHigh: valueData.priceRangeHigh || 0,
          }
        : {}),
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching property data:', error);
    throw new Error(
      'Could not retrieve property information. Please check the address and try again.'
    );
  }
}

async function fetchPropertyDetails(address: string): Promise<PropertyData> {
  const params = new URLSearchParams({ address });
  // Get the token from localStorage
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/rentcast/property?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch property details');
  }

  const data = await response.json();
  return PropertySchema.parse(data);
}

async function fetchPropertyValue(
  address: string,
  propertyDetails: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
  }
): Promise<PropertyData> {
  const params = new URLSearchParams({ address });

  // RentCast valuation requires property type, bedrooms, bathrooms, and square footage.
  if (propertyDetails.propertyType)
    params.append('propertyType', propertyDetails.propertyType);
  if (propertyDetails.bedrooms)
    params.append('bedrooms', propertyDetails.bedrooms.toString());
  if (propertyDetails.bathrooms)
    params.append('bathrooms', propertyDetails.bathrooms.toString());
  if (propertyDetails.squareFootage)
    params.append('squareFootage', propertyDetails.squareFootage.toString());

  const response = await fetch(`/api/rentcast/value?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch property value');
  }

  const data = await response.json();
  return PropertySchema.parse(data);
}
