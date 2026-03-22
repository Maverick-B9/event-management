import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const FROM_NAME = process.env.FROM_NAME || "Ignited Minds";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        return res.status(500).json({ error: "Gmail credentials not configured on server" });
    }

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
        return res.status(400).json({ error: "Missing required fields: to, subject, html" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `${FROM_NAME} <${GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return res.status(200).json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to send email" });
    }
}
