import "dotenv/config";
import { auth } from "../src/lib/auth";

async function createAdmin() {
  try {
    const user = await auth.api.signUpEmail({
      body: {
        email: "admin@siteledger.com",
        password: "SuperSecretPassword123!",
        name: "Main Contractor",
        // The schema sets the role field initially
        role: "contractor", 
      }
    });
    console.log("Admin created successfully!", user);
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

createAdmin();
