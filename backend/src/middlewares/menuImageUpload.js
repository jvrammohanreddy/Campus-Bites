const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const menuImageDirectory = path.join(__dirname, '../../uploads/menu');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter(_req, file, callback) {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return callback(new Error('Upload a JPG, PNG, or WebP image.'));
        }
        callback(null, true);
    }
});

const uploadMenuImage = (req, res, next) => {
    multerUpload.single('image')(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Image must be 5 MB or smaller.' });
        }
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: 'Could not process the uploaded image.' });
        }
        return res.status(400).json({ message: error.message });
    });
};

const getImageExtension = (buffer) => {
    if (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
        return '.png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return '.jpg';
    }
    if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
        return '.webp';
    }
    return null;
};

const saveMenuImage = async (file) => {
    if (!file) return undefined;

    const extension = getImageExtension(file.buffer);
    const expectedExtensions = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
    };
    if (!extension || extension !== expectedExtensions[file.mimetype]) {
        const error = new Error('The uploaded file is not a valid JPG, PNG, or WebP image.');
        error.status = 400;
        throw error;
    }

    await fs.mkdir(menuImageDirectory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(path.join(menuImageDirectory, filename), file.buffer, { flag: 'wx' });
    return `/uploads/menu/${filename}`;
};

const deleteMenuImage = async (imageUrl) => {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/menu/')) return;

    const filename = imageUrl.slice('/uploads/menu/'.length);
    if (!/^[\da-f-]+\.(?:jpg|png|webp)$/i.test(filename)) return;

    try {
        await fs.unlink(path.join(menuImageDirectory, filename));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
};

module.exports = { uploadMenuImage, saveMenuImage, deleteMenuImage };
