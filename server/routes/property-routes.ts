import { ClientError, authMiddleware } from '../lib/index.js';
import express from 'express';
import pg from 'pg';

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const router = express.Router();
router.use(authMiddleware);

// GET all properties for a user
router.get('/', async (req, res, next) => {
  try {
    console.log(`GET /properties/${req.user?.userId} requested`);

    // Verify user is authenticated
    const userId = Number(req.user?.userId);
    if (!userId) {
      console.warn(`Invalid userId provided: ${req.user?.userId}`);

      throw new ClientError(400, 'userId is required');
    }

    const sql = `
        SELECT * from "properties"
        WHERE "userId" = $1
        ORDER by "propertyId"
        `;
    const result = await db.query(sql, [userId]);
    console.log(`Found ${result.rows.length} properties for user ${userId}`);

    res.json(result.rows);
  } catch (err) {
    console.error(`Error in GET /properties/${req.user?.userId}:`, err);

    next(err);
  }
});

// GET a property by ID
router.get('/property/:propertyId', async (req, res, next) => {
  try {
    console.log(`GET /properties/property/${req.params.propertyId} requested`);

    const userId = Number(req.user?.userId);
    if (!userId) {
      throw new ClientError(401, 'Authentication required');
    }

    const propertyId = Number(req.params.propertyId);
    if (!propertyId) {
      console.warn(`Invalid propertyId provided: ${req.params.propertyId}`);

      throw new ClientError(400, 'propertyId is required');
    }

    const sql = `
        SELECT * from "properties"
        WHERE "propertyId" = $1 AND "userId" = $2
        `;
    const result = await db.query(sql, [propertyId, userId]);
    console.log(`Found property with id ${propertyId}`);
    if (result.rows.length === 0) {
      console.warn(`Property with id ${propertyId} not found`);
      throw new ClientError(404, `Property with id ${propertyId} not found`);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error in GET /properties/property/${req.params.propertyId}:`,
      err
    );

    next(err);
  }
});

// POST a new property
router.post('/', authMiddleware, async (req, res, next) => {
  console.log('Received property data:', req.body);
  console.log('User from token:', req.user);
  try {
    console.log('POST /properties requested');

    // Verify user is authenticated
    const userId = Number(req.user?.userId);
    if (!userId) {
      console.warn(`Invalid userId provided: ${req.user?.userId}`);

      throw new ClientError(401, 'Authentication required');
    }

    const {
      formattedAddress,
      price,
      priceRangeLow,
      priceRangeHigh,
      type,
      beds,
      bath,
      squareFootage,
      yearBuilt,
      lastSale,
      lastSalePrice,
    } = req.body;
    if (!formattedAddress) {
      throw new ClientError(400, 'Address is required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    let image = '';

    if (apiKey) {
      image = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(
        formattedAddress
      )}&key=${apiKey}`;
    } else {
      console.warn('No Google Maps API key configured for property images');
    }

    const sql = `
        INSERT into "properties" 
        ("userId",  
        "formattedAddress",
        "type",
        "beds",
        "bath",
        "squareFootage",
        "yearBuilt",
        "lastSale",
        "lastSalePrice",
        "image3")
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
        `;

    const params = [
      userId,
      formattedAddress,
      Math.round(price) || 0,
      Math.round(priceRangeLow) || 0,
      Math.round(priceRangeHigh) || 0,
      type || 'Single Family',
      beds || 0,
      bath || 0,
      Math.round(squareFootage) || 0,
      Math.round(yearBuilt) || 0,
      lastSale || '',
      Math.round(lastSalePrice) || 0,
      image,
    ];
    console.log('Params:', params);

    const result = await db.query(sql, params);
    console.log('Result:', result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error in POST /properties:', err);

    next(err);
  }
});

// PUT to update a property
router.put('/:propertyId', async (req, res, next) => {
  try {
    console.log('Put Property Request params:', req.params);
    console.log('Put Property Request body:', req.body);

    // Verify user is authenticated
    const userId = Number(req.user?.userId);
    if (!userId) {
      throw new ClientError(401, 'Authentication required');
    }

    const propertyId = Number(req.params.propertyId);
    if (!propertyId) {
      console.warn('Invalid propertyId provided:', req.params.propertyId);
      throw new ClientError(400, 'propertyId is required');
    }

    // Verify Owner
    const verifyOwnerSql = `
     SELECT * FROM "properties" 
     WHERE "propertyId" = $1 AND "userId" = $2
   `;
    const ownershipResult = await db.query(verifyOwnerSql, [
      propertyId,
      userId,
    ]);

    if (ownershipResult.rows.length === 0) {
      throw new ClientError(403, 'Not authorized to update this property');
    }

    const {
      notes,
      monthlyRent,
      mortgagePayment,
      mortgageBalance,
      hoaPayment,
      interestRate,
    } = req.body;

    const sql = `
        UPDATE "properties"
        SET 
        "notes" = $1,
        "monthlyRent" = $2,
        "mortgagePayment" = $3,
        "mortgageBalance" = $4,
        "hoaPayment" = $5,
        "interestRate" = $6
        WHERE "propertyId" = $7
        RETURNING *;
        `;

    const params = [
      notes || null,
      monthlyRent !== undefined ? Math.round(monthlyRent) : null,
      mortgagePayment !== undefined ? Math.round(mortgagePayment) : null,
      mortgageBalance !== undefined ? Math.round(mortgageBalance) : null,
      hoaPayment !== undefined ? Math.round(hoaPayment) : null,
      interestRate !== undefined ? Math.round(interestRate) : null,
      propertyId,
    ];

    const result = await db.query(sql, params);

    if (result.rows.length === 0) {
      throw new ClientError(404, `Property with id ${propertyId} not found`);
    }

    console.log('Updated property:', result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in PUT /properties/:propertyId:', err);

    next(err);
  }
});

// DELETE a property
router.delete('/:propertyId', async (req, res, next) => {
  try {
    console.log('Delete Property Request params:', req.params);

    const userId = Number(req.user?.userId);
    if (!userId) {
      throw new ClientError(401, 'Authentication required');
    }

    const propertyId = Number(req.params.propertyId);
    if (!propertyId) {
      console.warn('Invalid propertyId provided:', req.params.propertyId);
      throw new ClientError(400, 'propertyId is required');
    }

    // Verify ownership
    const verifyOwnerSql = `
    SELECT * FROM "properties" 
    WHERE "propertyId" = $1 AND "userId" = $2
    `;
    const ownershipResult = await db.query(verifyOwnerSql, [
      propertyId,
      userId,
    ]);
    if (ownershipResult.rows.length === 0) {
      throw new ClientError(403, 'Not authorized to delete this property');
    }

    const sql = `
      DELETE FROM "properties"
      WHERE "propertyId" = $1
      RETURNING *
    `;

    const result = await db.query(sql, [propertyId]);

    if (result.rows.length === 0) {
      throw new ClientError(404, `Property with id ${propertyId} not found`);
    }

    console.log('Deleted property:', result.rows[0]);

    res.sendStatus(204);
  } catch (err) {
    console.error('Error in DELETE /properties/:propertyId:', err);

    next(err);
  }
});

export default router;
