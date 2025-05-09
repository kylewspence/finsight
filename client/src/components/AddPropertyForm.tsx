// client/src/components/AddPropertyForm.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getPropertyDetails } from '@/lib/rentcast-service';
import { readToken } from '@/lib/data';
import { PropertyType } from '@/types/PropertyTypes';

interface AddPropertyFormProps {
  onPropertyAdded: (property: PropertyType) => void;
  onCancel: () => void;
}

export function AddPropertyForm({
  onPropertyAdded,
  onCancel,
}: AddPropertyFormProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!address.trim()) {
      setError('Please enter a valid address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the new function for a clean data flow
      const newProperty = await savePropertyToDatabase(address);

      // Pass the complete property to parent
      onPropertyAdded(newProperty);

      // Clear form
      setAddress('');
    } catch (err) {
      console.error('Error saving property:', err);
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setLoading(false);
    }
  }

  async function savePropertyToDatabase(
    address: string
  ): Promise<PropertyType> {
    // Call our rentcast service to get property details
    const propertyData = await getPropertyDetails(address);

    //Format data for database
    const dataToSend = {
      formattedAddress: propertyData.formattedAddress,
      price : propertyData.price || 0,
      priceRangeLow:
        propertyData.priceRangeLow || 0,
      type: propertyData.propertyType || 'Single Family',
      beds: propertyData.bedrooms?.toString() || '0',
      bath: propertyData.bathrooms?.toString() || '0',
      squareFootage: propertyData.squareFootage || 0,
      yearBuilt: propertyData.yearBuilt || 0,
      lastSale: propertyData.lastSale || '',
      lastSalePrice: propertyData.lastSalePrice || 0,
    };

    // Save to database
    const token = readToken();
    if (!token) {
      throw new Error('You must be logged in to save properties');
    }

    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save property');
    }

    //Get saved property with database ID and image URL
    const savedProperty = await response.json();

    // Transform the database response to match PropertyType
    return {
      id: savedProperty.id,
      formattedAddress: savedProperty.formattedAddress,
      propertyType: savedProperty.type,
      bedrooms: savedProperty.beds,
      bathrooms: savedProperty.bath,
      squareFootage: savedProperty.squareFootage,
      yearBuilt: savedProperty.yearBuilt,
      lastSale: savedProperty.lastSale,
      lastSalePrice: savedProperty.lastSalePrice,
      price: savedProperty.price,
      priceRangeLow: savedProperty.priceRangeLow,
      monthlyRent: 0,
      image: savedProperty.image,
      notes: '',
      mortgagePayment: 0,
      mortgageBalance: 0,
      hoaPayment: 0,
      interestRate: 0,
    };
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Property Address
        </label>
        <Input
          id="address"
          type="text"
          placeholder="Enter full address (e.g. 123 Main St, City, State, ZIP)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Add Property'}
        </Button>
      </div>
    </form>
  );
}
