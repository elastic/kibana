/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { ensureOk, send } from '../http';
import { openSshSession } from './ssh_transport';
import type { SshSession, SshTarget } from './ssh_transport';

// Git protocol v2 client (ls-refs + fetch) over smart-HTTP or SSH. Ported from the git-rule-delivery POC.

const FLUSH = Buffer.from('0000');
const DELIM = Buffer.from('0001');

const GIT_HEADERS = {
  'Git-Protocol': 'version=2',
  'User-Agent': 'kibana-rule-library',
};

type PktLine = { kind: 'data'; payload: Buffer } | { kind: 'flush' | 'delim' | 'end' };

export interface GitRef {
  name: string;
  sha: string;
}

export interface GitObject {
  id: string;
  type: string;
  data: Buffer;
}

export interface GitTreeEntry {
  mode: string;
  name: string;
  id: string;
}

export interface GitFile {
  path: string;
  blobId: string;
}

export interface GitRequestOptions {
  // Fails the request when the server's response is larger, instead of buffering all of it.
  maxResponseBytes?: number;
}

export interface GitClient {
  getCapabilities(): Promise<string[]>;
  listRefs(prefixes: string[]): Promise<GitRef[]>;
  listFiles(
    commitSha: string,
    isMatch: (path: string) => boolean,
    options?: GitRequestOptions
  ): Promise<GitFile[]>;
  fetchBlobs(blobIds: string[], options?: GitRequestOptions): Promise<Map<string, Buffer>>;
  close(): Promise<void>;
}

export interface GitClientOptions {
  url: string;
  headers?: Record<string, string>;
}

export interface SshGitClientOptions {
  target: SshTarget;
  privateKey: string;
  knownHosts: string;
}

// How bytes reach the server: the advertisement is its v2 greeting, runCommand sends one request body.
export interface GitTransport {
  getAdvertisement(): Promise<Buffer>;
  runCommand(body: Buffer, options?: GitRequestOptions): Promise<Buffer>;
  close(): Promise<void>;
}

const pktLine = (text: string): Buffer => {
  const payload = Buffer.from(text, 'utf8');
  const length = (payload.length + 4).toString(16).padStart(4, '0');
  return Buffer.concat([Buffer.from(length), payload]);
};

const readPktLines = (buffer: Buffer): PktLine[] => {
  const lines: PktLine[] = [];
  let pos = 0;
  while (pos < buffer.length) {
    const length = parseInt(buffer.subarray(pos, pos + 4).toString(), 16);
    if (Number.isNaN(length)) throw new Error(`Bad pkt-line at byte ${pos}`);
    if (length === 0) {
      lines.push({ kind: 'flush' });
      pos += 4;
    } else if (length === 1) {
      lines.push({ kind: 'delim' });
      pos += 4;
    } else if (length === 2) {
      lines.push({ kind: 'end' });
      pos += 4;
    } else {
      lines.push({ kind: 'data', payload: buffer.subarray(pos + 4, pos + length) });
      pos += length;
    }
  }
  return lines;
};

// Pack parsing

const OBJECT_TYPES: Record<number, string> = { 1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag' };
const OFS_DELTA = 6;
const REF_DELTA = 7;

const hashObject = (type: string, data: Buffer): string =>
  createHash('sha1').update(`${type} ${data.length}\0`).update(data).digest('hex');

const bit = (value: number, index: number): boolean => Math.floor(value / 2 ** index) % 2 === 1;

const applyDelta = (base: Buffer, delta: Buffer): Buffer => {
  let pos = 0;
  const readVarint = (): number => {
    let value = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = delta[pos++];
      value += (byte % 128) * 2 ** shift;
      shift += 7;
    } while (byte >= 0x80);
    return value;
  };

  readVarint();
  const result = Buffer.alloc(readVarint());
  let out = 0;

  while (pos < delta.length) {
    const op = delta[pos++];
    if (op >= 0x80) {
      let offset = 0;
      let length = 0;
      for (let i = 0; i < 4; i++) if (bit(op, i)) offset += delta[pos++] * 2 ** (8 * i);
      for (let i = 0; i < 3; i++) if (bit(op, 4 + i)) length += delta[pos++] * 2 ** (8 * i);
      if (length === 0) length = 0x10000;
      base.copy(result, out, offset, offset + length);
      out += length;
    } else if (op > 0) {
      delta.copy(result, out, pos, pos + op);
      out += op;
      pos += op;
    } else {
      throw new Error('Invalid delta instruction 0');
    }
  }
  return result;
};

interface ObjectHeader {
  typeCode: number;
  size: number;
  baseOffset?: number;
  baseId?: string;
  dataStart: number;
}

const readObjectHeader = (pack: Buffer, start: number): ObjectHeader => {
  let pos = start;
  let byte = pack[pos++];
  const typeCode = Math.floor(byte / 16) % 8;
  let size = byte % 16;
  let shift = 4;
  while (byte >= 0x80) {
    byte = pack[pos++];
    size += (byte % 128) * 2 ** shift;
    shift += 7;
  }

  let baseOffset: number | undefined;
  let baseId: string | undefined;
  if (typeCode === OFS_DELTA) {
    byte = pack[pos++];
    let distance = byte % 128;
    while (byte >= 0x80) {
      byte = pack[pos++];
      distance = (distance + 1) * 128 + (byte % 128);
    }
    baseOffset = start - distance;
  } else if (typeCode === REF_DELTA) {
    baseId = pack.subarray(pos, pos + 20).toString('hex');
    pos += 20;
  }
  return { typeCode, size, baseOffset, baseId, dataStart: pos };
};

interface InflateInfo {
  buffer: Buffer;
  engine: { bytesWritten: number };
}

const inflateObject = (
  pack: Buffer,
  { dataStart, size }: ObjectHeader
): { inflated: Buffer; compressedLength: number } => {
  // zlib finds the end of its own stream; chunkSize = size avoids a 16 KB buffer per small object.
  const { buffer, engine } = inflateSync(pack.subarray(dataStart), {
    info: true,
    chunkSize: Math.max(64, size),
  }) as unknown as InflateInfo;
  if (buffer.length !== size) throw new Error(`Object at byte ${dataStart}: size mismatch`);
  return { inflated: buffer, compressedLength: engine.bytesWritten };
};

const resolveObject = (
  { typeCode }: ObjectHeader,
  inflated: Buffer,
  base?: { type: string; data: Buffer }
): { type: string; data: Buffer } => {
  if (typeCode !== OFS_DELTA && typeCode !== REF_DELTA) {
    return { type: OBJECT_TYPES[typeCode], data: inflated };
  }
  if (!base) throw new Error('Delta base not in pack');
  return { type: base.type, data: applyDelta(base.data, inflated) };
};

export const parsePack = (pack: Buffer): Map<string, GitObject> => {
  if (pack.subarray(0, 4).toString() !== 'PACK') throw new Error('Not a packfile');
  const count = pack.readUInt32BE(8);
  const byId = new Map<string, GitObject>();
  const byOffset = new Map<number, GitObject>();
  let pos = 12;

  for (let i = 0; i < count; i++) {
    const header = readObjectHeader(pack, pos);
    const { inflated, compressedLength } = inflateObject(pack, header);
    const base =
      header.baseId !== undefined
        ? byId.get(header.baseId)
        : header.baseOffset !== undefined
        ? byOffset.get(header.baseOffset)
        : undefined;
    const { type, data } = resolveObject(header, inflated, base);
    const object = { id: hashObject(type, data), type, data };
    byId.set(object.id, object);
    byOffset.set(pos, object);
    pos = header.dataStart + compressedLength;
  }
  return byId;
};

export const parseTree = (data: Buffer): GitTreeEntry[] => {
  const entries: GitTreeEntry[] = [];
  let pos = 0;
  while (pos < data.length) {
    const space = data.indexOf(0x20, pos);
    const nul = data.indexOf(0x00, space);
    entries.push({
      mode: data.subarray(pos, space).toString(),
      name: data.subarray(space + 1, nul).toString(),
      id: data.subarray(nul + 1, nul + 21).toString('hex'),
    });
    pos = nul + 21;
  }
  return entries;
};

const createHttpTransport = ({ url, headers = {} }: GitClientOptions): GitTransport => {
  const repoUrl = url.replace(/\/$/, '');

  return {
    getAdvertisement: async () =>
      ensureOk(
        await send(`${repoUrl}/info/refs?service=git-upload-pack`, {
          headers: { ...GIT_HEADERS, ...headers },
        })
      ),
    runCommand: async (body, options) =>
      ensureOk(
        await send(`${repoUrl}/git-upload-pack`, {
          maxBytes: options?.maxResponseBytes,
          method: 'POST',
          headers: {
            ...GIT_HEADERS,
            ...headers,
            'Content-Type': 'application/x-git-upload-pack-request',
            Accept: 'application/x-git-upload-pack-result',
          },
          body,
        })
      ),
    close: async () => {},
  };
};

// The SSH session is opened on first use and reused for every request until close().
const createSshTransport = ({
  target,
  privateKey,
  knownHosts,
}: SshGitClientOptions): GitTransport => {
  let session: Promise<SshSession> | undefined;
  const getSession = (): Promise<SshSession> => {
    session ??= openSshSession({ target, privateKey, knownHosts });
    return session;
  };

  return {
    getAdvertisement: async () => (await getSession()).advertisement,
    runCommand: async (body, options) => (await getSession()).exchange(body, options),
    close: async () => {
      const opened = await session?.catch(() => undefined);
      await opened?.close();
    },
  };
};

const createClientOnTransport = (transport: GitTransport): GitClient => {
  const runCommand = async (
    command: string,
    args: string[],
    options?: GitRequestOptions
  ): Promise<Buffer> =>
    transport.runCommand(
      Buffer.concat([
        pktLine(`command=${command}\n`),
        DELIM,
        ...args.map((arg) => pktLine(`${arg}\n`)),
        FLUSH,
      ]),
      options
    );

  const fetchPack = async (args: string[], options?: GitRequestOptions): Promise<Buffer> => {
    const response = await runCommand('fetch', [...args, 'no-progress', 'done'], options);
    const payloads = readPktLines(response).flatMap((line) =>
      line.kind === 'data' ? [line.payload] : []
    );
    const start = payloads.findIndex((payload) => payload.toString() === 'packfile\n');
    if (start === -1) throw new Error('Server reply had no packfile section');

    const chunks: Buffer[] = [];
    for (const payload of payloads.slice(start + 1)) {
      const band = payload[0];
      const data = payload.subarray(1);
      if (band === 1) chunks.push(data);
      if (band === 3) throw new Error(`Server error: ${data.toString()}`);
    }
    return Buffer.concat(chunks);
  };

  const getCapabilities = async (): Promise<string[]> => {
    const advertisement = await transport.getAdvertisement();
    const lines = readPktLines(advertisement).flatMap((line) =>
      line.kind === 'data' ? [line.payload.toString().trim()] : []
    );
    if (!lines.includes('version 2')) {
      throw new Error(`Server does not speak git protocol v2: ${lines.join(' | ').slice(0, 200)}`);
    }
    const capabilities = lines.filter((line) => !line.startsWith('#') && line !== 'version 2');
    if (!capabilities.some((cap) => cap.startsWith('fetch=') && cap.includes('filter'))) {
      throw new Error('Server does not support "filter", cannot skip file contents');
    }
    return capabilities;
  };

  const listRefs = async (prefixes: string[]): Promise<GitRef[]> => {
    const response = await runCommand('ls-refs', [
      'peel',
      ...prefixes.map((prefix) => `ref-prefix ${prefix}`),
    ]);
    return readPktLines(response).flatMap((line) => {
      if (line.kind !== 'data') return [];
      const [sha, name, ...rest] = line.payload.toString().trim().split(' ');
      const peeled = rest.find((attr) => attr.startsWith('peeled:'))?.slice('peeled:'.length);
      return [{ name, sha: peeled ?? sha }];
    });
  };

  const listFiles = async (
    commitSha: string,
    isMatch: (path: string) => boolean,
    options?: GitRequestOptions
  ): Promise<GitFile[]> => {
    const pack = await fetchPack([`want ${commitSha}`, 'deepen 1', 'filter blob:none'], options);
    const objects = parsePack(pack);
    const commit = objects.get(commitSha);
    if (!commit) throw new Error(`Commit ${commitSha} missing from server reply`);
    const rootTreeId = commit.data.toString().match(/^tree ([0-9a-f]{40})/)?.[1];
    if (!rootTreeId) throw new Error(`Commit ${commitSha} has no tree`);

    const files: GitFile[] = [];
    const walk = (treeId: string, prefix: string): void => {
      const tree = objects.get(treeId);
      if (!tree) throw new Error(`Tree ${treeId} missing from server reply`);
      for (const { mode, name, id } of parseTree(tree.data)) {
        const path = prefix + name;
        if (mode === '40000') walk(id, `${path}/`);
        else if (isMatch(path)) files.push({ path, blobId: id });
      }
    };
    walk(rootTreeId, '');
    return files;
  };

  const fetchBlobs = async (
    blobIds: string[],
    options?: GitRequestOptions
  ): Promise<Map<string, Buffer>> => {
    const pack = await fetchPack(
      blobIds.map((id) => `want ${id}`),
      options
    );
    const blobs = new Map<string, Buffer>();
    for (const [id, { data }] of parsePack(pack)) blobs.set(id, data);
    return blobs;
  };

  return { getCapabilities, listRefs, listFiles, fetchBlobs, close: transport.close };
};

export const createGitClient = (options: GitClientOptions): GitClient =>
  createClientOnTransport(createHttpTransport(options));

export const createSshGitClient = (options: SshGitClientOptions): GitClient =>
  createClientOnTransport(createSshTransport(options));
