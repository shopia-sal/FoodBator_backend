import itemModal from "../modals/itemModal.js";

export const createItem = async (req, res, next) => {
    try {
        const { name, description, category, price, rating, hearts } = req.body;
        let imageUrl = '';

        if (req.file) {
            // Format base64 yang bisa dibaca langsung oleh Cloudinary
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            
            const cloudName = "dweimllm7"; 
            const uploadPreset = "foodbator_preset"; 
            
            const uniqueName = `menu_${Date.now()}`; // Buat nama unik tanpa garis miring
            
            // Tembak gambar langsung ke server Cloudinary
            const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64Image,
                    upload_preset: uploadPreset,
                    public_id: uniqueName,
                    // 👇👇👇 INI OBAT PENAWARNYA 👇👇👇
                    display_name: uniqueName // Paksa Cloudinary pakai nama ini agar tidak error
                })
            });

            const cloudinaryData = await cloudinaryResponse.json();
            
            if (cloudinaryData.secure_url) {
                imageUrl = cloudinaryData.secure_url; // URL gambar berhasil didapat!
            } else {
                console.error("Cloudinary Error:", cloudinaryData);
                return res.status(400).json({ 
                    message: 'Gagal upload gambar ke Cloudinary',
                    alasan: cloudinaryData.error?.message 
                });
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
            
            // Pengaman darurat untuk gambar lama yang pakai /uploads/
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
