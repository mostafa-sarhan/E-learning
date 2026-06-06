import mongoose from "mongoose";
import UserModel from "./models/userModel";

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/students";
    await mongoose.connect(mongoUri);

    const existingAdmin = await UserModel.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    const admin = await UserModel.create({
      name: "المدير العام",
      email: "admin@route-academy.com",
      password: "admin123",
      role: "admin",
    });

    console.log("Admin created:", admin.email);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
