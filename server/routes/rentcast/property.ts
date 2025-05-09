import { ClientError } from '../../lib';
// import { authMiddleware } from "../../lib/authorization-middleware";
import express from 'express';

const router = express.Router();
// router.use(authMiddleware);

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;
const RENTCAST_BASE_URL = 'https://api.rentcast.io/v1';

router.get('/', async (req, res, next) => {
  try {
    console.log('GET /api/rentcast/property requested');

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      console.warn('Missing or invalid address parameter:', address);
      throw new ClientError(400, 'Valid address is required');
    }

    if (!RENTCAST_API_KEY) {
      console.error('Rentcast API key not configured');
      throw new ClientError(500, 'Rentcast API key not configured');
    }

    const rentcastUrl = `${RENTCAST_BASE_URL}/properties?address=${encodeURIComponent(
      address
    )}`;

    const response = await fetch(rentcastUrl, {
      headers: {
        'X-Api-Key': RENTCAST_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `RentCast API error: Status ${response.status} for address ${address}`
      );
      throw new ClientError(
        response.status,
        'Failed to fetch property data from RentCast'
      );
    }

    const responseData = await response.json();
    // RentCast sometimes returns an array of properties, we want the best result at [0].
    const propertyData = Array.isArray(responseData)
      ? responseData[0]
      : responseData;

    if (!propertyData) {
      console.warn(`No property data found for address ${address}`);
      throw new ClientError(404, 'Property not found');
    }

    // Format the data to match our expected schema before sending it to the client.
    const formattedData = {
      formattedAddress: propertyData.formattedAddress || address,
      propertyType: propertyData.propertyType || 'Single Family',
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      squareFootage: propertyData.squareFootage || 0,
      yearBuilt: propertyData.yearBuilt || 0,
      lastSale: propertyData.lastSale || '',
      lastSalePrice: propertyData.lastSalePrice || 0,
      price: propertyData.price || 0,
      priceRangeLow: propertyData.priceRangeLow || 0,
      priceRangeHigh: propertyData.priceRangeHigh || 0,
    };

    console.log(`Successfully retrieved property data for: ${address}`);
    res.json(formattedData);
  } catch (err) {
    console.error('Error in GET /api/rentcast/property:', err);
    next(err);
  }
});

export default router;
