import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { validateSharedSecret } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

// Maximum audio upload size: 25MB (Whisper API limit)
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // 1. Shared secret authentication
    const auth = validateSharedSecret(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.reason }, { status: 401 });
    }

    // 2. Rate limiting (by client IP or fallback)
    const ip = req.headers.get('x-forwarded-for') || 'localhost';
    const rate = checkRateLimit(ip, 30, 60_000); // 30 reqs/min
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    // 3. Parse incoming FormData
    const formData = await req.formData();
    const audioFile = formData.get('file');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'No audio file provided in FormData (field "file").' },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Audio file too large. Max allowed is 25MB. Provided: ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB` },
        { status: 413 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    // 4. Fallback / Mock Mode if GROQ_API_KEY is not yet configured
    if (!groqApiKey || groqApiKey.trim() === '' || groqApiKey === 'your_groq_api_key_here') {
      console.warn('[PAA Backend] GROQ_API_KEY not configured. Returning fallback mock transcription.');
      return NextResponse.json({
        text: 'Today I will be working on the PDF, the landing page, and the API fix.',
        isMock: true,
        notice: 'Mock transcript returned because GROQ_API_KEY is not set in backend/.env.local',
      });
    }

    // 5. Call Groq Whisper API
    const groq = new Groq({ apiKey: groqApiKey });

    // In Next.js route handlers, Blob/File from req.formData() works with groq-sdk
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
    });

    return NextResponse.json({
      text: transcription.text,
      isMock: false,
    });
  } catch (error: any) {
    console.error('[PAA Backend] Error in /api/transcribe:', error);
    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
