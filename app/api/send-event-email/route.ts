import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { eventName, eventSlug, clientEmail, passcode } = await request.json();
    const baseUrl = "https://event-master-saas.vercel.app";

    const { data, error } = await resend.emails.send({
      from: 'Event Master <onboarding@resend.dev>',
      to: clientEmail, 
      subject: `🎉 Your Event Platform is Ready: ${eventName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
          
          <!-- HEADER -->
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f3f4f6;">
            <h1 style="color: #9333ea; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Event Infrastructure Deployed</h1>
            <p style="color: #6b7280; font-size: 14px; font-weight: bold; margin-top: 0;">Welcome to your digital platform for <strong>${eventName}</strong></p>
          </div>

          <!-- THE HOW-TO GUIDE -->
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #3b82f6; margin-top: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">📖 Host Quick-Start Guide</h2>
            <ol style="padding-left: 20px; color: #475569; font-size: 14px; margin-bottom: 0;">
              <li style="margin-bottom: 10px;"><strong>Set Up (Pre-Event):</strong> Open your <strong>Admin Dashboard</strong> using your Secure Passcode. Customize your backgrounds, add your prize lists, and enter your Cloud Folder link.</li>
              <li style="margin-bottom: 10px;"><strong>Invite Guests:</strong> Share the <strong>RSVP Link</strong> via email or text so attendees can register ahead of time.</li>
              <li style="margin-bottom: 10px;"><strong>At the Door:</strong> Give your reception team the <strong>Door Check-in</strong> link on a tablet or phone to seamlessly check guests in.</li>
              <li style="margin-bottom: 10px;"><strong>Show Time:</strong> Connect a laptop to the main venue TV and open the <strong>Live Projector</strong> link. Give your DJ or host the <strong>Emcee Remote</strong> on their phone to spin the wheel!</li>
              <li><strong>After Party:</strong> Guests can use the <strong>Upload/Download</strong> portal to share their photos, and view the <strong>Memory Gallery</strong> to see the night's winners.</li>
            </ol>
          </div>

          <p style="font-size: 15px; font-weight: bold; color: #111827;">Here are your official access keys and QR codes. Distribute these to your team:</p>
          
          <hr style="border: 1px solid #f3f4f6; margin: 25px 0;" />
          
          <!-- ADMIN & RSVP -->
          <table width="100%" style="margin-bottom: 25px;">
            <tr>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">⚙️ Admin Dashboard</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/admin" style="color: #3b82f6;">${baseUrl}/${eventSlug}/admin</a></p>
                <p style="font-size: 13px;"><strong>Passcode:</strong> <span style="background: #e5e7eb; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-weight: bold;">${passcode}</span></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/admin" alt="Admin QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">💌 Guest RSVP</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/rsvp" style="color: #3b82f6;">${baseUrl}/${eventSlug}/rsvp</a></p>
                <br/>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/rsvp" alt="RSVP QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
            </tr>
          </table>

          <!-- DOOR & EMCEE -->
          <table width="100%" style="margin-bottom: 25px;">
            <tr>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">📱 Door Check-In</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/guest" style="color: #3b82f6;">${baseUrl}/${eventSlug}/guest</a></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/guest" alt="Guest QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">🎤 Emcee Remote</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/emcee" style="color: #3b82f6;">${baseUrl}/${eventSlug}/emcee</a></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/emcee" alt="Emcee QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
            </tr>
          </table>

          <!-- PROJECTOR & UPLOAD -->
          <table width="100%" style="margin-bottom: 25px;">
            <tr>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">📺 Live Projector</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}" style="color: #3b82f6;">${baseUrl}/${eventSlug}</a></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}" alt="Projector QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
              <td width="50%" valign="top">
                <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase;">📸 Photo Upload/Download</h3>
                <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/upload" style="color: #3b82f6;">${baseUrl}/${eventSlug}/upload</a></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/upload" alt="Upload QR" style="border-radius: 8px; border: 1px solid #e5e7eb;" />
              </td>
            </tr>
          </table>

          <!-- MEMORY GALLERY -->
          <div style="text-align: center; background-color: #fcfcfc; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <h3 style="color: #4b5563; font-size: 14px; text-transform: uppercase; margin-top: 0;">🫧 Memory Gallery</h3>
              <p style="font-size: 13px; word-break: break-all;"><a href="${baseUrl}/${eventSlug}/memory" style="color: #3b82f6;">${baseUrl}/${eventSlug}/memory</a></p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${baseUrl}/${eventSlug}/memory" alt="Memory QR" style="border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 10px;" />
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
            <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Powered by Party Master SaaS</p>
          </div>

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