const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type Recipient = { email: string; name?: string };

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export function senderInfo() {
  return {
    name: process.env.BREVO_SENDER_NAME || "AADC Cairo",
    email: process.env.BREVO_SENDER_EMAIL || "no-reply@aadc-cairo.com",
  };
}

export function buildEmailHtml(opts: {
  studyTitle: string;
  year: string;
  message: string;
}): string {
  const { studyTitle, year, message } = opts;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${studyTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;">
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#059669 0%,#0d9488 50%,#0891b2 100%);padding:40px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:6px 18px;font-size:12px;letter-spacing:1px;color:#ffffff;margin-bottom:20px;">AADC CAIRO</div>
      <h1 style="margin:0;font-size:28px;line-height:1.4;color:#ffffff;font-weight:800;">${studyTitle}</h1>
      <p style="margin:14px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">الدورة التدريبية — ${year}</p>
    </div>
    <!-- Body -->
    <div style="padding:36px 32px;">
      <p style="margin:0;font-size:18px;color:#f8fafc;font-weight:700;">مرحباً {{ params.name }} 👋</p>
      <div style="margin:22px 0 28px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:22px 24px;">
        <p style="margin:0;font-size:16px;line-height:1.9;color:#cbd5e1;">${message}</p>
      </div>
      <div style="background:#123a2c;border:1px solid #059669;border-radius:14px;padding:18px 22px;margin-bottom:30px;">
        <p style="margin:0;font-size:15px;line-height:1.8;color:#a7f3d0;">
          <strong style="color:#34d399;">تنبيه هام:</strong> نود تذكيركم بأن التسجيل في الدراسة يقارب على الانتهاء. يرجى استكمال الإجراءات المطلوبة قبل الموعد النهائي.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 34px;border-radius:999px;">تأكيد المشاركة</a>
      </div>
    </div>
    <!-- Footer -->
    <div style="border-top:1px solid #1e293b;padding:28px 32px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">AADC Cairo — الأكاديمية العربية للتدريب والتطوير</p>
      <p style="margin:6px 0 0;font-size:12px;color:#475569;">هذه رسالة آلية، يرجى عدم الرد عليها مباشرة.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendBrevoEmail(opts: {
  to: Recipient[];
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const { name, email } = senderInfo();

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "accept": "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name, email },
      to: opts.to.map((r) => ({
        email: r.email,
        name: r.name || r.email,
        params: { name: r.name || "المشارك" },
      })),
      subject: opts.subject,
      htmlContent: opts.htmlContent,
    }),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      `Brevo error ${res.status}: ${
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
          : text
      }`,
    );
  }

  return data;
}
