import crypto from 'crypto';

// Generate a random JWT_SECRET (min 32 chars, base64)
const jwtSecret = crypto.randomBytes(32).toString('base64');

// Generate a random ENCRYPTION_KEY (exactly 32 chars for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('\n=== Copy these into your .env file ===\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('\n=== Also set: ===\n');
console.log('MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname');
console.log('CLIENT_ORIGIN=https://your-vercel-or-netlify-url.com');
console.log('\n');
