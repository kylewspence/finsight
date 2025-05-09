

INSERT INTO "users" ("userId", "userName", "hashedPassword")
VALUES
  (1, 'kdubs1', '$argon2id$v=19$m=65536,t=3,p=4$hJZ+bXoGbVpKLDy/OBtaTg$lpDtMvEx+Im5T5BzwbELTnHFwif8wiEzha6cy5flMLc');

INSERT INTO "properties" (
  "userId", "formattedAddress", "price" "priceRangeLow", "priceRangeHigh",
  "type", "beds", "bath", "squareFootage", "yearBuilt", "lastSale", "lastSalePrice",
  "mortgagePayment", "mortgageBalance", "hoaPayment", "monthlyRent", "interestRate",
  "notes", "image"
)
VALUES (
  1,
  '30925 W Fairmount Ave, Buckeye, AZ 85396',
  394000,
  372000,
  409760,
  'Single Family',
  4,
  3,
  1712,
  2019,
  '2022-01-01T00:00:00.000Z',
  399900,
  0,
  0,
  100,
  1800,
  0.00,
  'Notes test',
  'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=30925%20W%20Fairmount%20Ave%2C%20Buckeye%2C%20AZ%2085396&key=AIzaSyA89BdPRdEMhtWENaL6m3-Wmmkbggl6XRk'
),(
    1,
    '1548 S 228th Ct, Buckeye, AZ 85326',
    368000, 335000, 0,
    'Single Family', 3, 2, 1603, 2002,
    '2018-06-05T00:00:00.000Z', 185000,
    1185, 219600, 100, 1800, 3.00,
    NULL,
    'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=1548%20S%20228th%20Ct,%20Buckeye,%20AZ%2085326&key=AIzaSyA89BdPRdEMhtWENaL6m3-Wmmkbggl6XRk'
  ),
  (
    1,
    '23100 W Papago St, Buckeye, AZ 85326',
    378000, 360000, 0,
    'Single Family', 4, 3, 1920, 2003,
    '2020-05-12T00:00:00.000Z', 225000,
    0, 0, 100, 1800, 0.00,
    NULL,
    'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=23100%20W%20Papago%20St,%20Buckeye,%20AZ%2085326&key=AIzaSyA89BdPRdEMhtWENaL6m3-Wmmkbggl6XRk'
  ),
  (1, '24475 W Atlanta Ave, Buckeye, AZ 85326', 371000, 355000, 0, 'Single Family', 3, 3, 1551, 2017, '2022-01-12T00:00:00.000Z', 364900, 0, 0, 100, 1800, 0.00, NULL, 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=24475%20W%20Atlanta%20Ave,%20Buckeye,%20AZ%2085326&key=AIzaSyA89BdPRdEMhtWENaL6m3-Wmmkbggl6XRk'),
(1, '23973 W Hidalgo Ave, Buckeye, AZ 85326', 375000, 354000, 0, 'Single Family', 4, 3, 1569, 2008, '2018-09-25T00:00:00.000Z', 191000, 0, 0, 100, 1800, 0.00, 'Test', 'https://maps.googleapis.com/maps/api/streetview?size=600x400&location=23973%20W%20Hidalgo%20Ave,%20Buckeye,%20AZ%2085326&key=AIzaSyA89BdPRdEMhtWENaL6m3-Wmmkbggl6XRk');