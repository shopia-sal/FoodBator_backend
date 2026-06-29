import express from 'express';
import multer from 'multer';
import { createItem, getItems, deleteItem } from '../contollers/itemController.js'; 

const itemRouter = express.Router();

// Ubah ke memoryStorage agar aman di Vercel
const storage = multer.memoryStorage();
const upload = multer({ storage });

itemRouter.post('/', upload.single('image'), createItem);
itemRouter.get('/', getItems);
itemRouter.delete('/:id', deleteItem);

export default itemRouter;
