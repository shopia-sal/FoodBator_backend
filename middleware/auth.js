import pkg from 'jsonwebtoken';
const jwt = pkg;

const authMiddleware = (req, res, next) => {
    // Tambahkan 'req.headers.token' agar satpam mau menerima header 'token' dari frontend
    const token = req.cookies?.token || 
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]) || 
                  req.headers.token;

    if (!token) {
        return res.status(401).json({success: false, message: 'Token Missing'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) 
        req.user = {_id: decoded.id, email: decoded.email};
        next();
    }
    catch (err) {
        // Kita ubah error-nya jadi 401, supaya frontend kamu yang sudah disetting 
        // untuk redirect saat 401 bisa langsung jalan!
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid Token';
        res.status(401).json({success: false, message})
    }
}

export default authMiddleware;
