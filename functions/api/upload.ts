interface Env {
  BILLS_BUCKET?: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    if (!env.BILLS_BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket BILLS_BUCKET is not bound' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided in form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ext = file.name.split('.').pop() || 'pdf';
    const key = `bills/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    await env.BILLS_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    const publicUrl = `/api/files/${key}`;

    return new Response(
      JSON.stringify({
        url: publicUrl,
        key,
        fileName: file.name,
        fileType: file.type,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error uploading file to R2';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
