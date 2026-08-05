import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:8081",
    plugins: [expo()],
    trustedOrigins: [
        "siteledger://",
        ...(process.env.NODE_ENV === "development" ? [
            "exp://",
            "exp://**",
            "exp://192.168.*.*:*/**",
        ] : [])
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true,
        schema: {
            ...schema,
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
            },
            phone: {
                type: "string",
                required: false,
            }
        }
    },
    emailAndPassword: { 
        enabled: true,
    }, 
});
