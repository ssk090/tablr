import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";
import express from "express";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenvConfig({ path: join(__dirname, "../../.env") });

import { prisma } from "@tablr/database";
import { Resend } from "resend";

const app = express();
app.use(express.json());

const db = prisma;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send notification via Resend Email
 */
async function sendNotification(profileId: string, type: string, targetId: string) {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) return false;

  console.log(`\n🔔 [NOTIFICATION] To: ${profile.name} (${profile.email || "No email"})`);

  if (!profile.email) {
    console.log(`⚠️  Skipping email: No email address found for ${profile.name}`);
    return true; // Mark as processed even if no email
  }

  let subject = "";
  let html = "";

  const normalizedType = type.toLowerCase();

  if (normalizedType === "match_found") {
    const event = await db.diningEvent.findUnique({
      where: { id: targetId },
    });

    subject = "🍽️ Your Match has Manifested - Tablr";
    html = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000;">
          <div style="background-color: #050505; color: #ffffff; font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 60px 40px; border: 1px solid #1a1a1a;">
            <div style="text-align: center; margin-bottom: 60px;">
              <h1 style="color: #FF5A5F; font-size: 28px; font-weight: 900; letter-spacing: 8px; text-transform: uppercase; margin: 0;">Tablr</h1>
              <p style="color: #444; font-size: 11px; font-weight: 700; letter-spacing: 6px; text-transform: uppercase; margin-top: 10px;">Aether Concierge Service</p>
            </div>
            
            <div style="margin-bottom: 50px;">
              <h2 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 24px;">
                Good evening, ${profile.name}.<br/>
                <span style="color: #FF5A5F;">The table is set.</span>
              </h2>
              <p style="color: #888; font-size: 18px; line-height: 1.6; font-weight: 300;">
                Our algorithms have identified a singular alignment. Your presence is requested for a curated dining experience in Bangalore.
              </p>
            </div>
            
            <div style="background: linear-gradient(145deg, #0a0a0a, #111); border: 1px solid #222; border-radius: 24px; padding: 40px; margin-bottom: 50px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 25px; border-bottom: 1px solid #1a1a1a;">
                    <p style="color: #FF5A5F; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px 0;">The Venue</p>
                    <p style="font-size: 22px; font-weight: 700; margin: 0; color: #ffffff;">${event?.restaurantName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 25px 0; border-bottom: 1px solid #1a1a1a;">
                    <p style="color: #444; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px 0;">The Date</p>
                    <p style="font-size: 22px; font-weight: 700; margin: 0; color: #ffffff;">${event?.scheduledDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 25px 0 0 0;">
                    <p style="color: #444; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px 0;">The Hour</p>
                    <p style="font-size: 22px; font-weight: 700; margin: 0; color: #ffffff;">${event?.scheduledTime}</p>
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center;">
              <a href="https://tablr.app/dashboard/events/${targetId}" style="display: inline-block; background-color: #FF5A5F; color: #ffffff; text-decoration: none; padding: 22px 48px; border-radius: 100px; font-size: 15px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; transition: all 0.3s ease;">Manifest Attendance</a>
              <p style="color: #444; font-size: 12px; margin-top: 20px; font-weight: 400;">* Mutual confirmation required within 4 hours.</p>
            </div>
            
            <div style="margin-top: 80px; border-top: 1px solid #1a1a1a; padding-top: 40px; text-align: center;">
              <p style="color: #333; font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 20px;">
                Bangalore &middot; London &middot; New York
              </p>
              <div style="color: #222; font-size: 10px; line-height: 1.8;">
                &copy; 2026 Tablr Inc. All rights reserved.<br/>
                Professional social dining for the discerning few.<br/>
                <a href="#" style="color: #333; text-decoration: underline;">Unsubscribe</a> &middot; <a href="#" style="color: #333; text-decoration: underline;">Privacy Policy</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  if (resend && profile.email) {
    try {
      const { data, error } = await resend.emails.send({
        from: "Tablr <onboarding@resend.dev>",
        to: profile.email,
        subject: subject || "Notification from Tablr",
        html: html || `<p>You have a new notification: ${type}</p>`,
      });

      if (error) {
        console.error("❌ Resend Error:", error);
        return false;
      }
      console.log(`📧 Email sent via Resend: ${data?.id}`);
    } catch (err) {
      console.error("❌ Failed to call Resend API:", err);
      return false;
    }
  } else {
    console.log("📝 [MOCK] Email body:", html.replace(/<[^>]*>?/gm, " ").trim());
    if (!resend) console.log("💡 (Set RESEND_API_KEY in .env to send real emails)");
  }

  return true;
}

/**
 * Background worker to process pending notifications
 */
async function processNotifications() {
  const pending = await db.notification.findMany({
    where: { status: "PENDING" },
  });

  if (pending.length === 0) return;

  console.log(`\n[WORKER] Processing ${pending.length} pending notifications...`);

  for (const notification of pending) {
    try {
      const success = await sendNotification(
        notification.profileId,
        notification.type,
        notification.targetId,
      );
      if (success) {
        await db.notification.update({
          where: { id: notification.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
        console.log(`✅ Marked ${notification.id} as sent`);
      }
    } catch (error) {
      console.error(`❌ Failed to process notification ${notification.id}:`, error);
    }
  }
}

// Poll every 10 seconds
setInterval(processNotifications, 10000);

app.get("/health", async (_req, res) => {
  const pendingCount = await db.notification.count({
    where: { status: "PENDING" },
  });
  res.json({ status: "ok", pendingCount });
});

const PORT = process.env.NOTIFIER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Tablr Notifier running on port ${PORT}`);
  if (!process.env.RESEND_API_KEY) {
    console.log(`⚠️  RESEND_API_KEY not found. Running in MOCK mode.`);
  }
});
