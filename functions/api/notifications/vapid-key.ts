import { VAPID_PUBLIC_KEY } from '../_webpush';

export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
