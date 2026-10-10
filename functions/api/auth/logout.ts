export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'housesplits_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
};
