import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase';

export async function GET() {
  const url = process.env.SUPABASE_URL || '';
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supa = getSupabaseAdmin();
  
  if (!supa) {
    return NextResponse.json({
      success: false,
      error: 'Supabase client not initialized',
      env: {
        hasUrl: !!url,
        hasKey,
        url: url || 'NOT SET',
        urlLength: url.length
      }
    });
  }

  try {
    // Try to count rows in gz_runs table
    const { data, error, count } = await supa
      .from('gz_runs')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        env: {
          url,
          hasKey
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working!',
      rowCount: count,
      env: {
        url,
        hasKey: true
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Unknown error',
      cause: err.cause?.message || err.cause,
      stack: err.stack,
      env: {
        url,
        hasKey
      }
    });
  }
}

