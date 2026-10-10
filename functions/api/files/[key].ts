interface Env {
  BILLS_BUCKET?: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.BILLS_BUCKET) {
      return new Response('R2 not available', { status: 500 });
    }

    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/api\/files\//, '');

    const object = await env.BILLS_BUCKET.get(key);
    if (!object) {
      return new Response('File Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error retrieving file';
    return new Response(msg, { status: 500 });
  }
};
