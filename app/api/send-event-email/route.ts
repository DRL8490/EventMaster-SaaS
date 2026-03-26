import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { eventName, eventSlug, clientEmail, passcode } = await request.json();
    const baseUrl = "https://event-master-saas.vercel.app";

    // IMPORTANT SAAS NOTE: Until you buy and verify a custom domain in Resend, 
    // you must use 'onboarding@resend.dev' as the "from" address.
    const { data, error } = await resend.emails.send({
      from: 'Event Master <onboarding@resend.dev>',
      to: clientEmail, // In Sandbox mode, this MUST be the email you used to sign up for Resend!
      subject: `🎉 Your Event Platform is Ready: ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #9333ea;">Your Event Platform is Live!</h1>
          <p>Hello! The digital infrastructure for <strong>${eventName}</strong> has been successfully deployed.</p>
          <p>Please share these specific links and QR codes with your event staff.</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          
          <h2 style="color: #4b5563;">⚙️ For You (The Host)</h2>
          <p><strong>Admin Dashboard:</strong> <a href="${baseUrl}/${eventSlug}/admin">${baseUrl}/${eventSlug}/admin</a></p>
          <p><strong>Secure Passcode:</strong> <span style="background: #f3f4f6; padding: 4px 8px; font-family: monospace; font-weight: bold; border-radius: 4px;">${passcode}</span></p>
          <p><em>Do not share this passcode! Use this to manage RSVPs, suppliers, and prizes.</em></p>

          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          
          <h2 style="color: #4b5563;">📱 For the Receptionists (Front Door)</h2>
          <p><strong>Door Check-in App:</strong> <a href="${baseUrl}/${eventSlug}/guest">${baseUrl}/${eventSlug}/guest</a></p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}/${eventSlug}/guest" alt="Guest QR" />

          <h2 style="color: #4b5563;">🎤 For the DJ / Emcee (On Stage)</h2>
          <p><strong>Emcee Remote:</strong> <a href="${baseUrl}/${eventSlug}/emcee">${baseUrl}/${eventSlug}/emcee</a></p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}/${eventSlug}/emcee" alt="Emcee QR" />

          <h2 style="color: #4b5563;">📺 For the AV Team (Big Screen)</h2>
          <p><strong>Live Projector TV:</strong> <a href="${baseUrl}/${eventSlug}">${baseUrl}/${eventSlug}</a></p>

          <h2 style="color: #4b5563;">📸 For the Guests (After Party)</h2>
          <p><strong>Memory Gallery:</strong> <a href="${baseUrl}/${eventSlug}/memory">${baseUrl}/${eventSlug}/memory</a></p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}/${eventSlug}/memory" alt="Memory QR" />

          <p style="margin-top: 30px; font-size: 12px; color: #9ca3af;">Powered by Event Master SaaS</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ message: "Email sent successfully!" });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}