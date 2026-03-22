const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string;
const SENDER_EMAIL = (import.meta.env.VITE_SENDER_EMAIL as string) || "yashas1519@gmail.com";
const SENDER_NAME = (import.meta.env.VITE_SENDER_NAME as string) || "Ignited Minds";

export interface EmailResult {
    email: string;
    success: boolean;
    error?: string;
}

function buildWelcomeHTML(name: string, email: string, password: string, teamName: string, domain: string): string {
    return [
        '<div style="font-family: \'Segoe UI\', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f1a; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">',
        '<div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 32px; text-align: center;">',
        '<h1 style="color: #fff; margin: 0 0 8px; font-size: 28px; font-weight: 700;">Welcome to Ignited Minds!</h1>',
        '<p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your account has been created successfully</p>',
        '</div>',
        '<div style="padding: 32px;">',
        '<p style="color: #e2e8f0; font-size: 16px; margin: 0 0 24px;">Hi <strong style="color: #fff;">' + name + '</strong>,</p>',
        '<p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">You have been registered as a <strong style="color: #a78bfa;">Team Leader</strong> for the event. Below are your login credentials:</p>',
        '<div style="background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 24px; margin: 0 0 24px;">',
        '<div style="margin: 0 0 16px;">',
        '<span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">User ID (Email)</span>',
        '<div style="color: #60a5fa; font-size: 18px; font-weight: 600; font-family: \'Courier New\', monospace; margin-top: 4px;">' + email + '</div>',
        '</div>',
        '<div style="border-top: 1px solid #2a2a4a; padding-top: 16px;">',
        '<span style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Password</span>',
        '<div style="color: #34d399; font-size: 18px; font-weight: 600; font-family: \'Courier New\', monospace; margin-top: 4px;">' + password + '</div>',
        '</div>',
        '</div>',
        '<div style="background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 16px; margin: 0 0 24px;">',
        '<table style="width: 100%;"><tr>',
        '<td style="width: 50%; vertical-align: top;">',
        '<span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Team</span>',
        '<div style="color: #e2e8f0; font-size: 14px; font-weight: 500; margin-top: 2px;">' + teamName + '</div>',
        '</td>',
        '<td style="width: 50%; vertical-align: top;">',
        '<span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Domain</span>',
        '<div style="color: #c084fc; font-size: 14px; font-weight: 500; margin-top: 2px;">' + domain + '</div>',
        '</td>',
        '</tr></table>',
        '</div>',
        '<p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px;">Please change your password after your first login.</p>',
        '<p style="color: #64748b; font-size: 12px; margin: 0;">If you did not request this account, please ignore this email.</p>',
        '</div>',
        '<div style="background: #0a0a14; padding: 16px 32px; text-align: center; border-top: 1px solid #1a1a2e;">',
        '<p style="color: #475569; font-size: 11px; margin: 0;">Ignited Minds 2026 — Event Management Platform</p>',
        '</div>',
        '</div>',
    ].join("\n");
}

export async function sendWelcomeEmail(
    email: string,
    name: string,
    password: string,
    teamName: string,
    domain: string,
): Promise<EmailResult> {
    if (!BREVO_API_KEY) {
        console.warn("VITE_BREVO_API_KEY not set — skipping email to:", email);
        return { email, success: false, error: "VITE_BREVO_API_KEY not configured" };
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "accept": "application/json",
            },
            body: JSON.stringify({
                sender: { name: SENDER_NAME, email: SENDER_EMAIL },
                to: [{ email, name }],
                subject: "Welcome to Ignited Minds — Your Login Credentials",
                htmlContent: buildWelcomeHTML(name, email, password, teamName, domain),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
            return { email, success: false, error: errorMessage };
        }

        return { email, success: true };
    } catch (err: any) {
        return { email, success: false, error: err.message || "Network error sending email" };
    }
}
