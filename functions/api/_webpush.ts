// Cloudflare Pages Functions Native Web Push Utility (RFC 8291 + RFC 8292)
// Uses native Web Crypto API (crypto.subtle) without external dependencies

export const VAPID_PUBLIC_KEY =
  'BAt7m3_dZtbh6InoGgYqsnLxEcUcCfKJoWP8d4aEaeyWRsBT-Mag4vgcx8PrRimIYQzZsjmJXN-egNcSh7UCX3Q';

export const VAPID_JWK = {
  kty: 'EC',
  crv: 'P-256',
  d: 'Toe4dzgKfWgNaBeOtqUVWYw6llYK9U13GSkdgEiDisc',
  x: 'C3ubf91m1uHoiegaBiqycvERxRwJ8omhY_x3hoRp7JY',
  y: 'RsBT-Mag4vgcx8PrRimIYQzZsjmJXN-egNcSh7UCX3Q',
};

export const VAPID_SUBJECT = 'mailto:manager@dunhas.com';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(uint8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function createVapidJwt(audience: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'jwk',
    VAPID_JWK,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600, // 12 hours
    sub: VAPID_SUBJECT,
  };

  const unsignedToken = `${stringToBase64Url(JSON.stringify(header))}.${stringToBase64Url(
    JSON.stringify(payload)
  )}`;
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken)
  );

  return `${unsignedToken}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
}

export async function encryptWebPushPayload(
  clientP256dh: string,
  clientAuth: string,
  payload: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const clientPubRaw = base64UrlToUint8Array(clientP256dh);
  const clientAuthRaw = base64UrlToUint8Array(clientAuth);

  // 1. Generate ephemeral server ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  // 2. Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Compute shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeys.privateKey,
    256
  );

  // 4. Derive pseudo-random key (PRK1) using client auth as salt
  const webPushInfo = encoder.encode('WebPush: info\0');
  const ikmInfo = new Uint8Array(webPushInfo.length + clientPubRaw.length + serverPubRaw.length);
  ikmInfo.set(webPushInfo, 0);
  ikmInfo.set(clientPubRaw, webPushInfo.length);
  ikmInfo.set(serverPubRaw, webPushInfo.length + clientPubRaw.length);

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const ikm2Bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: clientAuthRaw,
      info: ikmInfo,
    },
    sharedSecretKey,
    256
  );

  // 5. Generate random 16-byte salt for record
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const prk2Key = await crypto.subtle.importKey(
    'raw',
    ikm2Bits,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive Content Encryption Key (CEK) & Nonce
  const cek = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode('Content-Encoding: aes128gcm\0'),
    },
    prk2Key,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  const nonce = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode('Content-Encoding: nonce\0'),
    },
    prk2Key,
    96 // 12 bytes
  );

  // 6. Format payload with 0x02 record delimiter
  const plaintext = encoder.encode(payload);
  const padded = new Uint8Array(plaintext.length + 2);
  padded.set(plaintext, 0);
  padded[plaintext.length] = 0x02;

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cek,
    padded
  );

  // 7. Compose RFC 8291 body: salt (16) || rs (4) || idlen (1) || serverPub (65) || ciphertext
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]); // 4096
  const idlen = new Uint8Array([65]);
  const cipherBytes = new Uint8Array(ciphertext);

  const body = new Uint8Array(16 + 4 + 1 + 65 + cipherBytes.length);
  body.set(salt, 0);
  body.set(rs, 16);
  body.set(idlen, 20);
  body.set(serverPubRaw, 21);
  body.set(cipherBytes, 86);

  return body;
}

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: any
): Promise<{ success: boolean; status: number; gone?: boolean }> {
  try {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJwt(audience);
    const bodyBytes = await encryptWebPushPayload(
      sub.p256dh,
      sub.auth,
      typeof payload === 'string' ? payload : JSON.stringify(payload)
    );

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: bodyBytes,
    });

    if (res.status === 404 || res.status === 410) {
      // Subscription expired or unregistered
      return { success: false, status: res.status, gone: true };
    }

    return { success: res.ok, status: res.status };
  } catch (err) {
    console.error('sendWebPush error:', err);
    return { success: false, status: 500 };
  }
}
