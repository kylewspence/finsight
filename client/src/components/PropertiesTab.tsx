// client/src/components/PropertiesTab.tsx
import { Carousel, Card } from './ui/apple-cards-carousel';
import { PropertyModal } from './PropertyModal';
import { Plus } from 'lucide-react';
import { ButtonWithIcon } from './ui/buttonwithicon';
import { AddPropertyForm } from './AddPropertyForm';
import { PropertyType } from '@/types/PropertyTypes';
import { useEffect, useState } from 'react';
import { readToken } from '@/lib/data';
import { useUser } from './useUser';
import { getStreetViewImage } from '@/lib/utils';



export default function PropertiesTab() {
  const { user } = useUser();
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    async function loadProperties() {
      try {
        const token = readToken();
        if (!token) {
          return; // Not logged in
        }

        const response = await fetch('/api/properties', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load properties');
        }

        const dbProperties = await response.json();

        // Convert database properties to PropertyType format
        const formattedProperties: PropertyType[] = dbProperties.map(
          (prop: PropertyType) => ({
            id: prop.id,
            formattedAddress: prop.formattedAddress,
            propertyType: prop.propertyType,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            squareFootage: prop.squareFootage,
            yearBuilt: prop.yearBuilt,
            lastSale: prop.lastSale,
            lastSalePrice: prop.lastSalePrice,
            price: prop.price,
            priceRangeLow: prop.priceRangeLow,
            priceRangeHigh: prop.priceRangeHigh,
            monthlyRent: prop.monthlyRent || 0,
            image: prop.image || getStreetViewImage(prop.formattedAddress),
            notes: prop.notes || '',
            mortgagePayment: prop.mortgagePayment || 0,
            mortgageBalance: prop.mortgageBalance || 0,
            hoaPayment: prop.hoaPayment || 0,
            interestRate: prop.interestRate || 0,
          })
        );

        setProperties(formattedProperties);
      } catch (err) {
        console.error('Error loading properties:', err);
      }
    }

    loadProperties();
  }, [user]);

  // Handle adding a new property
  function handlePropertyAdded(newProperty: PropertyType) {
    if (!newProperty.image && newProperty.formattedAddress) {
      // If the property doesn't have an image yet but has an address
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      newProperty.image = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(
        newProperty.formattedAddress
      )}&key=${apiKey}`;
    }
    setProperties([...properties, newProperty]);
    setShowAddForm(false);
  }

  async function handlePropertyUpdate(updatedProperty: PropertyType) {
    try {
      const token = readToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`/api/properties/${updatedProperty.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthlyRent: updatedProperty.monthlyRent || 0,
          notes: updatedProperty.notes || '',
          mortgageBalance: updatedProperty.mortgageBalance || 0,
          mortgagePayment: updatedProperty.mortgagePayment || 0,
          interestRate: updatedProperty.interestRate || 0,
          hoaPayment: updatedProperty.hoaPayment || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating property:', errorData);
        throw new Error('Failed to update property');
      }

      // Update local state with updated property
      setProperties((prevProperties) =>
        prevProperties.map((prop) =>
          prop.id === updatedProperty.id ? updatedProperty : prop
        )
      );
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Failed to update property.');
    }
  }

  async function handlePropertyDelete(propertyId: number) {
    try {
      const token = readToken();
      if (!token) throw new Error('No token found');

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      // Remove the property from local state
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (error) {
      alert('Failed to delete property.');
      console.error(error);
    }
  }

  // Transform properties into card data
  const cardsData = properties.map((property) => ({
    id: property.id,
    title: property.formattedAddress,
    src: property.image || '',
    content: (
      <PropertyModal
        property={property}
        onUpdate={handlePropertyUpdate}
        onClose={() => {
          setProperties;
        }}
        onDelete={handlePropertyDelete}
      />
    ),
  }));

  // Create carousel cards
  const cards = cardsData.map((card, index) => (
    <Card key={card.id} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Properties</h2>

        {showAddForm ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add New Property</h3>
              <AddPropertyForm
                onPropertyAdded={handlePropertyAdded}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        ) : (
          <ButtonWithIcon icon={Plus} onClick={() => setShowAddForm(true)}>
            Add Property
          </ButtonWithIcon>
        )}
      </div>
      <Carousel items={cards} />
    </div>
  );
}
