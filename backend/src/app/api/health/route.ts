import { NextResponse } from 'next/server';

export async function GET() {
  const hasGroqKey = Boolean(
    process.env.GROQ_API_KEY &&
    process.env.GROQ_API_KEY !== 'your_groq_api_key_here'
  );

  return NextResponse.json({
    status: 'ok',
    service: 'PAA Backend Proxy',
    groqConfigured: hasGroqKey,
    timestamp: new Date().toISOString(),
  });
}
