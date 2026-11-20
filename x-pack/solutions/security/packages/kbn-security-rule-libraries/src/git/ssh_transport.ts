/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'node:net';
import type { Socket } from 'node:net';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from 'node:crypto';
import type { Cipheriv, Decipheriv, KeyObject } from 'node:crypto';

// Minimal SSH 2 client on node:crypto and node:net, only as much as git needs: run
// `git-upload-pack '<repo>'` on a server and talk to it over one session. Ported from the git-rule-delivery POC.
//
//   key exchange  curve25519-sha256
//   host key      ssh-ed25519
//   user key      ssh-ed25519, unencrypted OpenSSH-format private key
//   cipher + MAC  aes128-ctr + hmac-sha2-256
// Not supported: encrypted keys, RSA/ECDSA keys, re-keying, compression, agents.
//
// Layers, bottom to top: packet codec (framing, encryption, MAC) -> key exchange -> user authentication ->
// one "session" channel running git. RFC 4253 (transport), 4252 (auth), 4254 (channels), 8731 (curve25519).

const CLIENT_VERSION = 'SSH-2.0-KibanaRuleLibrary';
const KEX = 'curve25519-sha256';
const HOST_KEY = 'ssh-ed25519';
const CIPHER = 'aes128-ctr';
const MAC = 'hmac-sha2-256';

const SEQUENCE_MODULUS = 2 ** 32;
const CHANNEL_WINDOW = 2 * 1024 * 1024;
const CHANNEL_MAX_PACKET = 32 * 1024;
const MAX_PACKET_LENGTH = 256 * 1024;
const CONNECT_TIMEOUT_MS = 30_000;
const IDLE_TIMEOUT_MS = 60_000;
// A server that sends a byte every few seconds would defeat the idle timeout alone.
const EXCHANGE_TIMEOUT_MS = 120_000;

const MSG = {
  DISCONNECT: 1,
  IGNORE: 2,
  DEBUG: 4,
  SERVICE_REQUEST: 5,
  SERVICE_ACCEPT: 6,
  KEXINIT: 20,
  NEWKEYS: 21,
  KEX_ECDH_INIT: 30,
  KEX_ECDH_REPLY: 31,
  USERAUTH_REQUEST: 50,
  USERAUTH_FAILURE: 51,
  USERAUTH_SUCCESS: 52,
  GLOBAL_REQUEST: 80,
  REQUEST_FAILURE: 82,
  CHANNEL_OPEN: 90,
  CHANNEL_OPEN_CONFIRMATION: 91,
  CHANNEL_OPEN_FAILURE: 92,
  CHANNEL_WINDOW_ADJUST: 93,
  CHANNEL_DATA: 94,
  CHANNEL_EXTENDED_DATA: 95,
  CHANNEL_EOF: 96,
  CHANNEL_CLOSE: 97,
  CHANNEL_REQUEST: 98,
  CHANNEL_SUCCESS: 99,
  CHANNEL_FAILURE: 100,
} as const;

// DER prefixes that wrap a raw 32-byte key so node:crypto can import it.
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export interface SshTarget {
  user: string;
  host: string;
  port: number;
  path: string;
}

export interface SshSessionOptions {
  target: SshTarget;
  privateKey: string;
  knownHosts: string;
}

export interface SshExchangeOptions {
  // Fails the request when the response is larger, instead of buffering all of it.
  maxResponseBytes?: number;
}

export interface SshSession {
  advertisement: Buffer;
  exchange: (body: Buffer, options?: SshExchangeOptions) => Promise<Buffer>;
  close: () => Promise<void>;
}

interface UserKey {
  privateKey: KeyObject;
  publicKey: Buffer;
}

interface CipherKeys {
  key: Buffer;
  iv: Buffer;
  macKey: Buffer;
}

interface Deferred<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Wire encoding (RFC 4251)
// ---------------------------------------------------------------------------

const u32 = (value: number): Buffer => {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
};

const str = (value: Buffer | string): Buffer => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return Buffer.concat([u32(bytes.length), bytes]);
};

const bool = (value: boolean): Buffer => Buffer.from([value ? 1 : 0]);
const nameList = (names: string[]): Buffer => str(names.join(','));
const typeByte = (type: number): Buffer => Buffer.from([type]);

// Big-endian integer as SSH "mpint": no leading zeros, a 0 byte first if the top bit is set.
const mpint = (bytes: Buffer): Buffer => {
  let start = 0;
  while (start < bytes.length && bytes[start] === 0) start += 1;
  const trimmed = bytes.subarray(start);
  const padded =
    trimmed.length > 0 && trimmed[0] >= 0x80 ? Buffer.concat([Buffer.from([0]), trimmed]) : trimmed;
  return str(padded);
};

interface Reader {
  bytes: (length: number) => Buffer;
  byte: () => number;
  u32: () => number;
  string: () => Buffer;
  text: () => string;
}

const createReader = (buffer: Buffer): Reader => {
  let pos = 0;
  const bytes = (length: number): Buffer => {
    if (pos + length > buffer.length) throw new Error('SSH message truncated');
    const out = buffer.subarray(pos, pos + length);
    pos += length;
    return out;
  };
  const u32Value = (): number => bytes(4).readUInt32BE(0);
  const string = (): Buffer => bytes(u32Value());
  return {
    bytes,
    byte: () => bytes(1)[0],
    u32: u32Value,
    string,
    text: () => string().toString('utf8'),
  };
};

// ---------------------------------------------------------------------------
// Keys and host verification
// ---------------------------------------------------------------------------

// Reads an unencrypted ed25519 key in OpenSSH format (what `ssh-keygen -t ed25519 -N ''` writes).
export const loadPrivateKey = (pem: string): UserKey => {
  const body = pem.match(
    /-----BEGIN OPENSSH PRIVATE KEY-----([\s\S]+?)-----END OPENSSH PRIVATE KEY-----/
  )?.[1];
  if (!body) {
    throw new Error('Only OpenSSH-format private keys are supported (ssh-keygen -t ed25519)');
  }

  const outer = createReader(Buffer.from(body.replace(/\s+/g, ''), 'base64'));
  if (outer.bytes(15).toString('latin1') !== 'openssh-key-v1\0') {
    throw new Error('The private key is not an OpenSSH key');
  }
  const cipherName = outer.text();
  outer.string(); // kdf name
  outer.string(); // kdf options
  if (cipherName !== 'none') {
    throw new Error("Encrypted private keys are not supported (create one with ssh-keygen -N '')");
  }
  if (outer.u32() !== 1) throw new Error('Expected exactly one key in the private key file');
  outer.string(); // public key blob

  const inner = createReader(outer.string());
  const checkA = inner.u32();
  const checkB = inner.u32();
  if (checkA !== checkB) throw new Error('The private key is corrupt');
  const type = inner.text();
  if (type !== HOST_KEY) {
    throw new Error(`Private key type ${type} is not supported, only ${HOST_KEY}`);
  }
  const publicKey = Buffer.from(inner.string());
  const seed = inner.string().subarray(0, 32);
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  return { privateKey, publicKey };
};

const fingerprint = (blob: Buffer): string =>
  `SHA256:${createHash('sha256').update(blob).digest('base64').replace(/=+$/, '')}`;

const hostPattern = (host: string, port: number): string =>
  port === 22 ? host : `[${host}]:${port}`;

const entryMatchesHost = (field: string, pattern: string): boolean =>
  field.split(',').some((entry) => {
    if (!entry.startsWith('|1|')) return entry === pattern;
    const [, , salt, hash] = entry.split('|');
    return (
      createHmac('sha1', Buffer.from(salt, 'base64')).update(pattern).digest('base64') === hash
    );
  });

// Throws unless the server's host key is listed in the library's known hosts.
export const verifyHostKey = ({
  host,
  port,
  blob,
  knownHosts,
}: {
  host: string;
  port: number;
  blob: Buffer;
  knownHosts: string;
}): void => {
  const pattern = hostPattern(host, port);
  const base64 = blob.toString('base64');

  const known = knownHosts
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter(
      ([hosts, type, key]) =>
        hosts &&
        !hosts.startsWith('#') &&
        !hosts.startsWith('@') &&
        type === HOST_KEY &&
        Boolean(key)
    )
    .filter(([hosts]) => entryMatchesHost(hosts, pattern));

  if (known.some(([, , key]) => key === base64)) return;
  if (known.length > 0) {
    throw new Error(
      `Host key changed for ${pattern} (now ${fingerprint(blob)}). ` +
        'The connection may be intercepted, or the server was reinstalled and its known hosts entry needs updating.'
    );
  }
  throw new Error(
    `Unknown host key for ${pattern} (${fingerprint(
      blob
    )}). Add "${pattern} ${HOST_KEY} ${base64}" to the library's known hosts.`
  );
};

// ---------------------------------------------------------------------------
// Packet codec (RFC 4253 section 6)
// ---------------------------------------------------------------------------
// Packet: uint32 length | byte padding length | payload | random padding | MAC. Before NEWKEYS nothing is
// encrypted and there is no MAC. After it, everything but the MAC goes through AES-CTR and the MAC is
// HMAC(seqnum | plain packet).

interface PacketStream {
  serverVersion: () => Promise<string>;
  next: () => Promise<Buffer>;
  sendRaw: (bytes: string) => void;
  send: (payload: Buffer) => void;
  enableSend: (keys: CipherKeys) => void;
  enableReceive: (keys: CipherKeys) => void;
}

const createPacketStream = (socket: Socket): PacketStream => {
  let buffer: Buffer = Buffer.alloc(0);
  let sendSequence = 0;
  let receiveSequence = 0;
  let sendKeys: { cipher: Cipheriv; macKey: Buffer } | null = null;
  let receiveKeys: { decipher: Decipheriv; macKey: Buffer } | null = null;
  let current: { first: Buffer; length: number } | null = null;
  let halted = false; // set after NEWKEYS until the receive keys are installed
  let haveVersion = false;
  let failure: Error | null = null;
  let waiter: Deferred<Buffer> | null = null;
  const queue: Buffer[] = [];

  const version: Deferred<string> & { promise: Promise<string> } = {
    promise: Promise.resolve(''),
    resolve: () => {},
    reject: () => {},
  };
  version.promise = new Promise<string>((resolve, reject) => {
    version.resolve = resolve;
    version.reject = reject;
  });
  // The caller may never await the version (when the connection fails first).
  version.promise.catch(() => {});

  const fail = (error: Error): void => {
    failure ??= error;
    version.reject(failure);
    if (waiter) {
      waiter.reject(failure);
      waiter = null;
    }
    socket.destroy();
  };

  const deliver = (payload: Buffer): void => {
    if (payload[0] === MSG.IGNORE || payload[0] === MSG.DEBUG) return;
    if (waiter) {
      waiter.resolve(payload);
      waiter = null;
    } else {
      queue.push(payload);
    }
  };

  const readVersionLine = (): boolean => {
    while (!haveVersion) {
      const end = buffer.indexOf(0x0a);
      if (end === -1) {
        if (buffer.length > 64 * 1024) throw new Error('No SSH version line from server');
        return false;
      }
      const line = buffer.toString('latin1', 0, end).replace(/\r$/, '');
      buffer = buffer.subarray(end + 1);
      // servers may send banner text before the version line
      if (line.startsWith('SSH-')) {
        if (!/^SSH-(2\.0|1\.99)-/.test(line)) throw new Error(`Unsupported SSH version: ${line}`);
        haveVersion = true;
        version.resolve(line);
      }
    }
    return true;
  };

  const readPackets = (): void => {
    if (!readVersionLine()) return;
    while (!halted) {
      const blockSize = receiveKeys ? 16 : 8;
      const macLength = receiveKeys ? 32 : 0;

      if (!current) {
        if (buffer.length < blockSize) return;
        const raw = buffer.subarray(0, blockSize);
        const first = Buffer.from(receiveKeys ? receiveKeys.decipher.update(raw) : raw);
        const length = first.readUInt32BE(0);
        if (length < 5 || length > MAX_PACKET_LENGTH || (length + 4) % blockSize !== 0) {
          throw new Error('Bad SSH packet length');
        }
        current = { first, length };
        buffer = buffer.subarray(blockSize);
      }

      const restLength = current.length + 4 - blockSize;
      if (buffer.length < restLength + macLength) return;
      const rest = buffer.subarray(0, restLength);
      const plain = Buffer.concat([
        current.first,
        receiveKeys ? receiveKeys.decipher.update(rest) : rest,
      ]);

      if (receiveKeys) {
        const expected = createHmac('sha256', receiveKeys.macKey)
          .update(u32(receiveSequence))
          .update(plain)
          .digest();
        const received = buffer.subarray(restLength, restLength + macLength);
        if (!timingSafeEqual(expected, received)) {
          throw new Error('SSH message authentication failed');
        }
      }
      buffer = buffer.subarray(restLength + macLength);
      current = null;
      receiveSequence = (receiveSequence + 1) % SEQUENCE_MODULUS;

      const payload = Buffer.from(plain.subarray(5, plain.length - plain[4]));
      if (payload[0] === MSG.NEWKEYS) halted = true; // what follows needs the new keys
      deliver(payload);
    }
  };

  const readSafely = (): void => {
    try {
      readPackets();
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  };

  socket.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    readSafely();
  });
  socket.on('error', fail);
  socket.on('close', () => fail(new Error('SSH connection closed')));
  socket.setTimeout(IDLE_TIMEOUT_MS, () => fail(new Error('SSH connection timed out')));

  return {
    serverVersion: () => version.promise,
    next: () => {
      const queued = queue.shift();
      if (queued) return Promise.resolve(queued);
      if (failure) return Promise.reject(failure);
      return new Promise<Buffer>((resolve, reject) => {
        waiter = { resolve, reject };
      });
    },
    sendRaw: (bytes) => {
      socket.write(bytes);
    },
    send: (payload) => {
      const blockSize = sendKeys ? 16 : 8;
      let padding = blockSize - ((5 + payload.length) % blockSize);
      if (padding < 4) padding += blockSize;
      const packet = Buffer.concat([
        u32(1 + payload.length + padding),
        Buffer.from([padding]),
        payload,
        randomBytes(padding),
      ]);
      if (sendKeys) {
        const mac = createHmac('sha256', sendKeys.macKey)
          .update(u32(sendSequence))
          .update(packet)
          .digest();
        socket.write(Buffer.concat([sendKeys.cipher.update(packet), mac]));
      } else {
        socket.write(packet);
      }
      sendSequence = (sendSequence + 1) % SEQUENCE_MODULUS;
    },
    enableSend: ({ key, iv, macKey }) => {
      sendKeys = { cipher: createCipheriv('aes-128-ctr', key, iv), macKey };
    },
    enableReceive: ({ key, iv, macKey }) => {
      receiveKeys = { decipher: createDecipheriv('aes-128-ctr', key, iv), macKey };
      halted = false;
      readSafely();
    },
  };
};

// ---------------------------------------------------------------------------
// Key exchange (RFC 4253 section 7, RFC 8731)
// ---------------------------------------------------------------------------

const buildKexInit = (): Buffer =>
  Buffer.concat([
    typeByte(MSG.KEXINIT),
    randomBytes(16),
    nameList([KEX]),
    nameList([HOST_KEY]),
    nameList([CIPHER]),
    nameList([CIPHER]),
    nameList([MAC]),
    nameList([MAC]),
    nameList(['none']),
    nameList(['none']),
    nameList([]),
    nameList([]),
    bool(false),
    u32(0),
  ]);

const checkServerKexInit = (payload: Buffer): void => {
  const reader = createReader(payload);
  reader.bytes(17); // message type + cookie
  const offered = Array.from({ length: 8 }, () => reader.text().split(','));
  const [kex, hostKey, cipherC2S, cipherS2C, macC2S, macS2C] = offered;
  const needs: Array<[string, string[], string]> = [
    ['key exchange', kex, KEX],
    ['host key', hostKey, HOST_KEY],
    ['cipher (client to server)', cipherC2S, CIPHER],
    ['cipher (server to client)', cipherS2C, CIPHER],
    ['MAC (client to server)', macC2S, MAC],
    ['MAC (server to client)', macS2C, MAC],
  ];
  for (const [label, list, wanted] of needs) {
    if (!list.includes(wanted)) {
      throw new Error(`Server offers no ${wanted} for ${label}. It offers: ${list.join(', ')}`);
    }
  }
};

const disconnectError = (payload: Buffer): Error => {
  const reader = createReader(payload.subarray(1));
  reader.u32();
  return new Error(`Server disconnected: ${reader.text()}`);
};

const expectMessage = async (stream: PacketStream, type: number, what: string): Promise<Buffer> => {
  const payload = await stream.next();
  if (payload[0] === MSG.DISCONNECT) throw disconnectError(payload);
  if (payload[0] !== type) {
    throw new Error(`Expected ${what} (${type}) but got message ${payload[0]}`);
  }
  return payload;
};

const keyExchange = async (
  stream: PacketStream,
  { host, port, knownHosts }: { host: string; port: number; knownHosts: string }
): Promise<Buffer> => {
  stream.sendRaw(`${CLIENT_VERSION}\r\n`);
  const serverVersion = await stream.serverVersion();

  const clientKexInit = buildKexInit();
  stream.send(clientKexInit);
  const serverKexInit = await expectMessage(stream, MSG.KEXINIT, 'KEXINIT');
  checkServerKexInit(serverKexInit);

  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const clientPublic = Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url');
  stream.send(Buffer.concat([typeByte(MSG.KEX_ECDH_INIT), str(clientPublic)]));

  const reply = createReader(
    (await expectMessage(stream, MSG.KEX_ECDH_REPLY, 'KEX_ECDH_REPLY')).subarray(1)
  );
  const hostKeyBlob = Buffer.from(reply.string());
  const serverPublic = Buffer.from(reply.string());
  const signatureBlob = reply.string();
  if (serverPublic.length !== 32) throw new Error('Bad server key exchange value');

  const secret = diffieHellman({
    privateKey,
    publicKey: createPublicKey({
      key: Buffer.concat([X25519_SPKI_PREFIX, serverPublic]),
      format: 'der',
      type: 'spki',
    }),
  });
  if (secret.every((byte) => byte === 0)) throw new Error('Bad key exchange result');

  const exchangeHash = createHash('sha256')
    .update(str(CLIENT_VERSION))
    .update(str(serverVersion))
    .update(str(clientKexInit))
    .update(str(serverKexInit))
    .update(str(hostKeyBlob))
    .update(str(clientPublic))
    .update(str(serverPublic))
    .update(mpint(secret))
    .digest();

  const hostKeyReader = createReader(hostKeyBlob);
  if (hostKeyReader.text() !== HOST_KEY) throw new Error('Server host key is not ssh-ed25519');
  const hostPublic = hostKeyReader.string();
  const signatureReader = createReader(signatureBlob);
  if (signatureReader.text() !== HOST_KEY) throw new Error('Server signature is not ssh-ed25519');
  const validSignature = verify(
    null,
    exchangeHash,
    createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, hostPublic]),
      format: 'der',
      type: 'spki',
    }),
    signatureReader.string()
  );
  if (!validSignature) throw new Error('Server host key signature is invalid');
  verifyHostKey({ host, port, blob: hostKeyBlob, knownHosts });

  const sessionId = exchangeHash;
  const derive = (letter: string): Buffer =>
    createHash('sha256')
      .update(mpint(secret))
      .update(exchangeHash)
      .update(letter)
      .update(sessionId)
      .digest();

  stream.send(typeByte(MSG.NEWKEYS));
  stream.enableSend({
    iv: derive('A').subarray(0, 16),
    key: derive('C').subarray(0, 16),
    macKey: derive('E'),
  });
  await expectMessage(stream, MSG.NEWKEYS, 'NEWKEYS');
  stream.enableReceive({
    iv: derive('B').subarray(0, 16),
    key: derive('D').subarray(0, 16),
    macKey: derive('F'),
  });

  return sessionId;
};

// ---------------------------------------------------------------------------
// User authentication (RFC 4252): public key, sent with its signature in one go
// ---------------------------------------------------------------------------

const authenticate = async (
  stream: PacketStream,
  { user, sessionId, key }: { user: string; sessionId: Buffer; key: UserKey }
): Promise<void> => {
  stream.send(Buffer.concat([typeByte(MSG.SERVICE_REQUEST), str('ssh-userauth')]));
  await expectMessage(stream, MSG.SERVICE_ACCEPT, 'SERVICE_ACCEPT');

  const keyBlob = Buffer.concat([str(HOST_KEY), str(key.publicKey)]);
  const fields = [
    str(user),
    str('ssh-connection'),
    str('publickey'),
    bool(true),
    str(HOST_KEY),
    str(keyBlob),
  ];
  const signature = sign(
    null,
    Buffer.concat([str(sessionId), typeByte(MSG.USERAUTH_REQUEST), ...fields]),
    key.privateKey
  );
  const signatureBlob = Buffer.concat([str(HOST_KEY), str(signature)]);
  stream.send(Buffer.concat([typeByte(MSG.USERAUTH_REQUEST), ...fields, str(signatureBlob)]));

  for (;;) {
    const payload = await stream.next();
    if (payload[0] === MSG.USERAUTH_SUCCESS) return;
    if (payload[0] === MSG.USERAUTH_FAILURE) {
      const methods = createReader(payload.subarray(1)).text();
      throw new Error(
        `SSH authentication failed for ${user} (server accepts: ${methods || 'nothing'})`
      );
    }
    if (payload[0] === MSG.DISCONNECT) throw disconnectError(payload);
  }
};

// ---------------------------------------------------------------------------
// Git over one session channel (RFC 4254)
// ---------------------------------------------------------------------------

// Follows git's pkt-lines (4 hex digits of length, then payload) as bytes stream by and returns true once the
// flush packet "0000" that ends a response has been seen. Only the length headers are looked at.
const createResponseTracker = (): ((chunk: Buffer) => boolean) => {
  let header = '';
  let skip = 0;
  return (chunk) => {
    for (let i = 0; i < chunk.length; ) {
      if (skip > 0) {
        const taken = Math.min(skip, chunk.length - i);
        skip -= taken;
        i += taken;
      } else {
        header += String.fromCharCode(chunk[i++]);
        if (header.length === 4) {
          const length = parseInt(header, 16);
          header = '';
          if (Number.isNaN(length) || length === 3) throw new Error('Bad pkt-line from server');
          if (length === 0) return true;
          if (length >= 4) skip = length - 4;
        }
      }
    }
    return false;
  };
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

interface RemoteChannel {
  id: number;
  window: number;
  maxPacket: number;
}

const openGitChannel = async (stream: PacketStream, path: string): Promise<RemoteChannel> => {
  stream.send(
    Buffer.concat([
      typeByte(MSG.CHANNEL_OPEN),
      str('session'),
      u32(0),
      u32(CHANNEL_WINDOW),
      u32(CHANNEL_MAX_PACKET),
    ])
  );
  let opened = await stream.next();
  while (opened[0] === MSG.GLOBAL_REQUEST) {
    // Servers announce things like their host keys right after login; we don't use them.
    const globalRequest = createReader(opened.subarray(1));
    globalRequest.text();
    if (globalRequest.byte()) stream.send(typeByte(MSG.REQUEST_FAILURE));
    opened = await stream.next();
  }
  if (opened[0] === MSG.CHANNEL_OPEN_FAILURE) {
    const failure = createReader(opened.subarray(1));
    failure.u32();
    failure.u32();
    throw new Error(`Server refused the session channel: ${failure.text()}`);
  }
  if (opened[0] !== MSG.CHANNEL_OPEN_CONFIRMATION) {
    throw new Error(`Unexpected message ${opened[0]} opening channel`);
  }
  const reader = createReader(opened.subarray(1));
  reader.u32(); // our channel id
  const remote: RemoteChannel = { id: reader.u32(), window: reader.u32(), maxPacket: reader.u32() };

  const request = (type: string, wantReply: boolean, ...args: Buffer[]): void =>
    stream.send(
      Buffer.concat([
        typeByte(MSG.CHANNEL_REQUEST),
        u32(remote.id),
        str(type),
        bool(wantReply),
        ...args,
      ])
    );

  // Asks the server for protocol v2. A server that ignores it falls back to v0, which the client reports.
  request('env', false, str('GIT_PROTOCOL'), str('version=2'));
  request('exec', true, str(`git-upload-pack ${shellQuote(path)}`));

  for (;;) {
    const payload = await stream.next();
    if (payload[0] === MSG.CHANNEL_SUCCESS) return remote;
    if (payload[0] === MSG.CHANNEL_FAILURE)
      throw new Error('Server refused to run git-upload-pack');
    if (payload[0] === MSG.CHANNEL_WINDOW_ADJUST) {
      const adjust = createReader(payload.subarray(1));
      adjust.u32();
      remote.window += adjust.u32();
    }
  }
};

interface ExchangeResponse {
  chunks: Buffer[];
  size: number;
  maxBytes?: number;
  stderr: string;
  done: boolean;
  track: (chunk: Buffer) => boolean;
}

// Connects, authenticates and starts git-upload-pack. `advertisement` is the server's v2 greeting (version +
// capabilities) as pkt-lines. `exchange` sends one request body and resolves with the whole response (up to
// and including its flush packet), one at a time.
export const openSshSession = async ({
  target,
  privateKey,
  knownHosts,
}: SshSessionOptions): Promise<SshSession> => {
  const { host, port, user, path } = target;
  const key = loadPrivateKey(privateKey);

  const socket = await new Promise<Socket>((resolve, reject) => {
    const created = connect({ host, port }, () => {
      created.setTimeout(0);
      resolve(created);
    });
    created.setTimeout(CONNECT_TIMEOUT_MS, () =>
      created.destroy(new Error(`Connecting to ${host}:${port} timed out`))
    );
    created.once('error', reject);
  });
  const stream = createPacketStream(socket);

  try {
    const sessionId = await keyExchange(stream, { host, port, knownHosts });
    await authenticate(stream, { user, sessionId, key });
    const remote = await openGitChannel(stream, path);

    const handle = (payload: Buffer, response: ExchangeResponse): void => {
      const reader = createReader(payload.subarray(1));
      switch (payload[0]) {
        case MSG.CHANNEL_DATA: {
          reader.u32();
          const data = reader.string();
          stream.send(
            Buffer.concat([typeByte(MSG.CHANNEL_WINDOW_ADJUST), u32(remote.id), u32(data.length)])
          );
          if (response.done) return;
          response.size += data.length;
          if (response.maxBytes !== undefined && response.size > response.maxBytes) {
            throw new Error(`The response is larger than ${response.maxBytes} bytes`);
          }
          response.chunks.push(Buffer.from(data));
          response.done = response.track(data);
          return;
        }
        case MSG.CHANNEL_EXTENDED_DATA: {
          reader.u32();
          reader.u32();
          const data = reader.string();
          stream.send(
            Buffer.concat([typeByte(MSG.CHANNEL_WINDOW_ADJUST), u32(remote.id), u32(data.length)])
          );
          response.stderr += data.toString('utf8');
          return;
        }
        case MSG.CHANNEL_WINDOW_ADJUST:
          reader.u32();
          remote.window += reader.u32();
          return;
        case MSG.CHANNEL_EOF:
        case MSG.CHANNEL_CLOSE: {
          if (response.done) return;
          const said =
            response.stderr.trim() ||
            Buffer.concat(response.chunks).toString('utf8').trim().slice(0, 300);
          throw new Error(`SSH channel closed by the server${said ? `: ${said}` : ''}`);
        }
        case MSG.CHANNEL_REQUEST: {
          reader.u32();
          reader.text();
          if (reader.byte()) {
            stream.send(Buffer.concat([typeByte(MSG.CHANNEL_FAILURE), u32(remote.id)]));
          }
          return;
        }
        case MSG.GLOBAL_REQUEST: {
          reader.text();
          if (reader.byte()) stream.send(typeByte(MSG.REQUEST_FAILURE));
          return;
        }
        case MSG.DISCONNECT:
          throw disconnectError(payload);
        case MSG.KEXINIT:
          throw new Error('The server asked for a re-key, which is not supported');
        default:
      }
    };

    const runExchange = async (
      body: Buffer | null,
      options?: SshExchangeOptions
    ): Promise<Buffer> => {
      const response: ExchangeResponse = {
        chunks: [],
        size: 0,
        maxBytes: options?.maxResponseBytes,
        stderr: '',
        done: false,
        track: createResponseTracker(),
      };
      for (let offset = 0; body && offset < body.length; ) {
        while (remote.window === 0) handle(await stream.next(), response);
        const size = Math.min(body.length - offset, remote.window, remote.maxPacket);
        stream.send(
          Buffer.concat([
            typeByte(MSG.CHANNEL_DATA),
            u32(remote.id),
            str(body.subarray(offset, offset + size)),
          ])
        );
        remote.window -= size;
        offset += size;
      }
      while (!response.done) handle(await stream.next(), response);
      return Buffer.concat(response.chunks);
    };

    // Destroying the socket with an error rejects whatever the exchange is waiting on. The session is
    // unusable afterwards, which is fine: a stalled server is a failed run.
    // TODO: queue exchanges or throw when one is running. Two at once share the stream's one waiter and hang.
    const exchange = async (body: Buffer | null, options?: SshExchangeOptions): Promise<Buffer> => {
      const timer = setTimeout(
        () =>
          socket.destroy(new Error(`SSH request timed out after ${EXCHANGE_TIMEOUT_MS / 1000}s`)),
        EXCHANGE_TIMEOUT_MS
      );
      try {
        return await runExchange(body, options);
      } finally {
        clearTimeout(timer);
      }
    };

    const advertisement = await exchange(null);

    const close = async (): Promise<void> => {
      if (socket.destroyed) return;
      const closed = new Promise<void>((resolve) => socket.once('close', () => resolve()));
      stream.send(Buffer.concat([typeByte(MSG.CHANNEL_CLOSE), u32(remote.id)]));
      socket.end();
      const timer = setTimeout(() => socket.destroy(), 2000);
      await closed;
      clearTimeout(timer);
    };

    return { advertisement, exchange, close };
  } catch (error) {
    socket.destroy();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Repo URLs
// ---------------------------------------------------------------------------

// Returns { user, host, port, path } for ssh://[user@]host[:port]/path and for the scp-like [user@]host:path,
// or null if `repoUrl` isn't an SSH address.
export const parseSshUrl = (repoUrl: string): SshTarget | null => {
  const url = repoUrl.match(/^ssh:\/\/(?:([^@/]+)@)?(\[[^\]]+\]|[^:/]+)(?::(\d+))?(\/.+)$/);
  if (url) {
    return {
      user: url[1] ?? 'git',
      host: url[2].replace(/^\[|\]$/g, ''),
      port: Number(url[3] ?? 22),
      path: url[4],
    };
  }
  const scp = repoUrl.match(/^(?![a-z][a-z0-9+.-]*:\/\/)(?:([^@/:]+)@)?([^:/]+):(.+)$/i);
  if (scp) return { user: scp[1] ?? 'git', host: scp[2], port: 22, path: scp[3] };
  return null;
};
