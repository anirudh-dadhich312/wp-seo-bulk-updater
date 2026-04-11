import multer from 'multer';

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const isCsv = /csv|excel|text/.test(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv');
    if (isCsv) cb(null, true);
    else cb(new Error('Only CSV files are accepted'));
  },
});
