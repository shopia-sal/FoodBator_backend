import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://bator_db_user:foodbator123@cluster0.klikxg2.mongodb.net/FoodWebBator')
    .then(() => console.log('DB CONNECTED'))
}