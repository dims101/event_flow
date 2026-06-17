export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ serverTime: Date.now() }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}
