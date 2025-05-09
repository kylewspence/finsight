import { ClientError } from '../../lib';
// import { authMiddleware } from "../../lib/authorization-middleware";
import express from 'express';

const router = express.Router();
// router.use(authMiddleware);

const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;
const RENTCAST_BASE_URL = 'https://api.rentcast.io/v1';

router.get('/', async (req, res, next) => {
  try {
    console.log('GET /api/rentcast/value requested');

    const { address, propertyType, bedrooms, bathrooms, squareFootage } =
      req.query;

    if (!address || typeof address !== 'string') {
      console.warn('Missing or invalid address parameter:', address);
      throw new ClientError(400, 'Valid address is required');
    }

    if (!RENTCAST_API_KEY) {
      console.error('Rentcast API key not configured');
      throw new ClientError(500, 'Rentcast API key not configured');
    }

    let rentcastUrl = `${RENTCAST_BASE_URL}/avm/value?address=${encodeURIComponent(
      address
    )}`;

    // Add optional parameters to the URL if they are provided.
    // RentCast Valuation requires property type, bedrooms, bathrooms, and square footage.
    if (propertyType && typeof propertyType === 'string')
      rentcastUrl += `&propertyType=${encodeURIComponent(propertyType)}`;

    if (bedrooms && !isNaN(Number(bedrooms)))
      rentcastUrl += `&bedrooms=${bedrooms}`;

    if (bathrooms && !isNaN(Number(bathrooms)))
      rentcastUrl += `&bathrooms=${bathrooms}`;

    if (squareFootage && !isNaN(Number(squareFootage)))
      rentcastUrl += `&squareFootage=${squareFootage}`;

    const response = await fetch(rentcastUrl, {
      headers: {
        'X-Api-Key': RENTCAST_API_KEY,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `RentCast Valuation API error: Status ${response.status} for address ${address}`
      );
      throw new ClientError(
        response.status,
        'Failed to fetch valuation data from RentCast'
      );
    }

    const valueData = await response.json();

    if (!valueData) {
      console.warn(`No value data found for address ${address}`);
      throw new ClientError(404, 'Property value estimate not found');
    }

    // Format the data to match our expected schema before sending it to the client.
    const formattedData = {
      formattedAddress: address,
      priceRangeHigh: valueData.priceRangeHigh || 0,
      priceRangeLow: valueData.priceRangeLow || 0,
      price: valueData.price || 0,
    };

    console.log(
      `Successfully retrieved property valuation data for: ${address}`
    );
    res.json(formattedData);
  } catch (err) {
    console.error('Error in GET /api/rentcast/value:', err);
    next(err);
  }
});

export default router;
