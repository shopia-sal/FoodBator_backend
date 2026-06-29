import itemModal from "../modals/itemModal.js";

export const createItem = async (req, res, next) => {
    try {
        const { name, description, category, price, rating, hearts } = req.body;
        let imageUrl = '';

        // Jika ada file gambar yang diupload
        if (req.file) {
            const base64Image = req.file.buffer.toString('base64');
            
            const imgbbApiKey = "f8f26e03d026c58aaee4792bb211b0cc"; 
            
            const formData = new URLSearchParams();
            formData.append("image", base64Image);

            const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                method: 'POST',
                body: formData
            });

            const imgbbData = await imgbbResponse.json();
            
            if (imgbbData.success) {
                imageUrl = imgbbData.data.url; // URL dari ImgBB
            } else {
                return res.status(400).json({ message: 'Gagal upload gambar ke ImgBB' });
            }
        }

        const total = Number(price) * 1;

        const newItem = new itemModal({
            name, 
            description, 
            category, 
            price, 
            rating, 
            hearts, 
            imageUrl, 
            total
        });

        const saved = await newItem.save();
        res.status(201).json(saved);
    }
    catch (err){
        if(err.code === 11000) {
           return res.status(400).json({ message: 'Item name already exists' });
        }
        next(err);
    }
}

// Get Function
export const getItems = async (_req, res, next) => {
    try {
        const items = await itemModal.find().sort({createdAt: -1});
        const host = `${_req.protocol}://${_req.get('host')}`;

        const withFullUrl = items.map(i => {
            let finalImageUrl = i.imageUrl;
            
            // Cek jika gambar lama masih pakai /uploads/
            if (finalImageUrl && finalImageUrl.startsWith('/uploads/')) {
                finalImageUrl = host + finalImageUrl;
            }
            
            return {
                ...i.toObject(),
                imageUrl: finalImageUrl || '',
            };
        });
        
        res.json(withFullUrl);
    } 
    catch (err){
        next(err);
    }
}

// Delete Function To Delete items
export const deleteItem = async (req, res, next) => {
    try {
        const removed = await itemModal.findByIdAndDelete(req.params.id);
        if(!removed) return res.status(404).json({ message: 'Item not Found' });
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }   
}
