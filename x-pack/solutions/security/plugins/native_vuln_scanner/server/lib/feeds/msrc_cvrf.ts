/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInBatches } from '@loaders.gl/core';
import { JSONLoader } from '@loaders.gl/json';
import { countInto, parseCvss } from './oval';
import { MAX_FEED_BYTES, isMsrcMonth } from './fetch';
import type { CvssScore } from './types';
import { truncateText } from '../truncate';

/*
 * One monthly MSRC CVRF v3.0 document is 30+ MB, over `MAX_DOCUMENT_BYTES` in json.ts, so it
 * is streamed (`@loaders.gl/json`, `$.Vulnerability` in small batches) and only the product
 * id -> name map is kept. A document that ends before its root object closes is an error: the
 * streaming parser alone would return the vulnerabilities read so far as if they were all.
 *
 * Kept per CVE: the title, one CVSS score and the Type 2 remediations whose `FixedBuild` is
 * `10.0.<build>.<ubr>` for a Windows product. Everything else is dropped and counted in `skipped`.
 */

/** A hard cap on one parse; a healthy month takes about a second. */
export const MSRC_PARSE_TIMEOUT_MS = 5 * 60 * 1000;

/** A document is fed to the parser in slices this size so the event loop gets a turn between them. */
const SLICE_BYTES = 64 * 1024;

const MAX_TITLE_CHARS = 1024;

const PRODUCT_TREE_LAST = 'MSRC CVRF lists vulnerabilities before its product tree';

/** Newer rows replace older KBs; a chain longer than this is cut, as findings bound it too. */
export const MAX_SUPERSEDED_KBS = 32;

/** `Windows 10 Version 22H2 for x64-based Systems`, `Windows Server 2025 (Server Core installation)`. */
const WINDOWS_PRODUCT_NAME = /^Windows (?:10|11|Server)/;

const NUMERIC_ID = /^\d+$/;
const FIXED_BUILD = /^10\.0\.(\d+)\.(\d+)$/;
const CVE_ID = /^CVE-\d{4}-\d+$/;
const KB_NUMBER = /^\d{1,9}$/;

/** MSRC `Remediation.Type`: 2 is a vendor fix (an update), the only kind that carries a build. */
const REMEDIATION_VENDOR_FIX = 2;

export const HOTPATCH_SUB_TYPE = 'Security Hotpatch Update';

/** The cumulative update's `SubType`; the matcher picks the regular fix by it, not by `!hotpatch`. */
export const SECURITY_UPDATE_SUB_TYPE = 'Security Update';

/** One fix for one Windows product: the host is affected below `fixedBuild` on the same `build`. */
export interface MsrcAdvisoryRow {
  cve: string;
  /** The MSRC product id, e.g. `12097` (Windows 10 22H2 x64). */
  productId: string;
  /** The KB number of the update, digits only. */
  kb: string;
  /** `10.0.<build>.<ubr>`. */
  fixedBuild: string;
  build: number;
  ubr: number;
  /** `Security Hotpatch Update`; the cumulative update is `false`. */
  hotpatch: boolean;
  /** `Security Update`, `Servicing Stack Update`, `Security Hotpatch Update`. */
  subType?: string;
  /** KBs the update replaces (`Supercedence`, MSRC's spelling), at most 32. */
  supersedes: string[];
}

/** The per-CVE facts a finding needs, for CVEs that have at least one row. */
export interface MsrcCve {
  id: string;
  title?: string;
  cvss?: CvssScore;
}

export interface MsrcCvrfResult {
  /** `DocumentTracking.Identification.ID`, e.g. `2026-Jul`. */
  documentId: string;
  /** `DocumentTracking.CurrentReleaseDate`; MSRC re-stamps old months, so it is the change signal. */
  currentReleaseDate?: string;
  rows: MsrcAdvisoryRow[];
  cves: MsrcCve[];
  /** Windows entries in the product tree. */
  products: number;
  /** Dropped items by reason (e.g. `remediation_other_build`). */
  skipped: Record<string, number>;
}

export interface ParseMsrcCvrfOptions {
  signal?: AbortSignal;
  /** Total time allowed for the whole read and parse. */
  timeoutMs?: number;
  /** Bytes allowed from the source, counted as they arrive. */
  maxBytes?: number;
}

export interface MsrcUpdatesIndexEntry {
  /** A validated month token, `2026-Nov`. */
  id: string;
  currentReleaseDate?: string;
}

export interface MsrcUpdatesIndexResult {
  months: MsrcUpdatesIndexEntry[];
  skipped: Record<string, number>;
}

type Json = Readonly<Record<string, unknown>>;

const asObject = (value: unknown): Json | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Json)
    : undefined;

const asArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** Tracks bracket depth outside strings, to tell a finished document from a cut-off one. */
interface JsonBalance {
  depth: number;
  inString: boolean;
  escaped: boolean;
  started: boolean;
  /** The first byte after any BOM and whitespace has been seen. */
  leadingDone: boolean;
  /** That first byte is `<`: the mirror holds the XML form of the document. */
  xml: boolean;
  /** A non-whitespace byte follows the closing bracket of the root object. */
  trailing: boolean;
}

const newBalance = (): JsonBalance => ({
  depth: 0,
  inString: false,
  escaped: false,
  started: false,
  leadingDone: false,
  xml: false,
  trailing: false,
});

const isJsonWhitespace = (byte: number): boolean =>
  byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;

const UTF8_BOM = [0xef, 0xbb, 0xbf];

const scanBalance = (state: JsonBalance, bytes: Uint8Array): void => {
  let { depth, inString, escaped, started, leadingDone, xml, trailing } = state;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (!leadingDone) {
      if (isJsonWhitespace(byte) || UTF8_BOM.includes(byte)) continue;
      leadingDone = true;
      xml = byte === 0x3c;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (byte === 0x5c) escaped = true;
      else if (byte === 0x22) inString = false;
      continue;
    }
    if (started && depth === 0 && !isJsonWhitespace(byte)) trailing = true;
    if (byte === 0x22) inString = true;
    else if (byte === 0x7b || byte === 0x5b) {
      depth++;
      started = true;
    } else if (byte === 0x7d || byte === 0x5d) depth--;
  }
  Object.assign(state, { depth, inString, escaped, started, leadingDone, xml, trailing });
};

const isComplete = ({ depth, inString, started }: JsonBalance): boolean =>
  started && depth === 0 && !inString;

const abortReason = (signal: AbortSignal | undefined): Error =>
  signal?.reason instanceof Error ? signal.reason : new Error('MSRC CVRF parse aborted');

/** Rejects on the deadline or the caller's abort; `dispose` must run when the parse is over. */
const startGuard = (
  timeoutMs: number,
  signal: AbortSignal | undefined
): { promise: Promise<never>; check: () => void; dispose: () => void } => {
  let dispose = (): void => undefined;
  let failure: Error | undefined;
  const deadline = Date.now() + timeoutMs;
  const promise = new Promise<never>((_, rejectPromise) => {
    const reject = (error: Error): void => {
      failure = failure ?? error;
      rejectPromise(error);
    };
    const timer = setTimeout(
      () => reject(new Error(`MSRC CVRF parse exceeded ${timeoutMs} ms`)),
      timeoutMs
    );
    timer.unref?.();
    const onAbort = () => reject(abortReason(signal));
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
    dispose = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
  });
  // A guard nobody raced against (the parse finished first) must not become an unhandled rejection.
  promise.catch(() => undefined);
  /**
   * Throws once the deadline or abort has passed, for loops that never wait on a source. It reads
   * the clock itself: a timer callback cannot run while the loop is only awaiting microtasks.
   */
  const check = (): void => {
    if (!failure && signal?.aborted) failure = abortReason(signal);
    if (!failure && Date.now() > deadline) {
      failure = new Error(`MSRC CVRF parse exceeded ${timeoutMs} ms`);
    }
    if (failure) throw failure;
  };
  return { promise, check, dispose };
};

async function* boundedChunks(
  input: AsyncIterable<Uint8Array> | Uint8Array,
  maxBytes: number,
  balance: JsonBalance,
  guard: Pick<ReturnType<typeof startGuard>, 'promise' | 'check'>
): AsyncGenerator<ArrayBuffer> {
  // `Symbol.asyncIterator in` rather than `instanceof Uint8Array`: a Buffer made in another
  // realm (a jest sandbox) is not an instance of this realm's Uint8Array.
  const source =
    Symbol.asyncIterator in input
      ? input[Symbol.asyncIterator]()
      : (async function* () {
          yield input;
        })();
  let total = 0;
  try {
    for (;;) {
      const next = await Promise.race([source.next(), guard.promise]);
      if (next.done) return;
      const chunk = next.value;
      total += chunk.byteLength;
      if (total > maxBytes) throw new Error(`MSRC CVRF is over ${maxBytes} bytes`);
      for (let offset = 0; offset < chunk.byteLength; offset += SLICE_BYTES) {
        // An in-memory body is one chunk, so the deadline is also checked between its slices.
        guard.check();
        const slice = chunk.subarray(offset, offset + SLICE_BYTES);
        scanBalance(balance, slice);
        if (balance.xml) {
          throw new Error(
            "MSRC CVRF is XML: the mirror holds the XML form of the document, which must be fetched with 'Accept: application/json'"
          );
        }
        if (balance.trailing) throw new Error('MSRC CVRF has unexpected data after the document');
        // loaders.gl takes ArrayBuffers. `new Uint8Array(view)` always copies, which also releases
        // the network chunk; `Buffer#slice` would return a view and expose its whole pool.
        yield new Uint8Array(slice).buffer;
        await yieldToEventLoop();
      }
    }
  } finally {
    // Not awaited: a source stuck in a pending read would never answer `return()`.
    Promise.resolve(source.return?.()).catch(() => undefined);
  }
}

const buildProducts = (productTree: unknown): Map<string, string> => {
  const products = new Map<string, string>();
  for (const entry of asArray(asObject(productTree)?.FullProductName)) {
    const object = asObject(entry);
    const id = asString(object?.ProductID);
    const name = asString(object?.Value);
    if (id && NUMERIC_ID.test(id) && name && WINDOWS_PRODUCT_NAME.test(name)) {
      products.set(id, name);
    }
  }
  return products;
};

/**
 * The first score set that covers a Windows product (a CVE's first set can be for another
 * product line), else the first set with a usable score.
 */
const pickCvss = (
  sets: readonly unknown[],
  windowsIds: ReadonlySet<string>
): CvssScore | undefined => {
  const scores = sets.flatMap((set) => {
    const object = asObject(set);
    const cvss = parseCvss(asString(object?.BaseScore), asString(object?.Vector), '3.1');
    if (!cvss) return [];
    const covers = asArray(object?.ProductID).some((id) => {
      const key = asString(id);
      return key !== undefined && windowsIds.has(key);
    });
    return [{ cvss, covers }];
  });
  return (scores.find(({ covers }) => covers) ?? scores[0])?.cvss;
};

const reduceVulnerability = (
  value: unknown,
  products: ReadonlyMap<string, string>,
  rows: MsrcAdvisoryRow[],
  cves: MsrcCve[],
  skipped: Record<string, number>
): void => {
  const vulnerability = asObject(value);
  const cve = asString(vulnerability?.CVE);
  if (!vulnerability || !cve || !CVE_ID.test(cve)) {
    countInto(skipped, 'vulnerability_missing_cve');
    return;
  }
  const seen = new Set<string>();
  const before = rows.length;
  for (const item of asArray(vulnerability.Remediations)) {
    const remediation = asObject(item);
    if (remediation?.Type !== REMEDIATION_VENDOR_FIX) continue;
    const fixedBuild = asString(remediation.FixedBuild);
    const match = fixedBuild ? FIXED_BUILD.exec(fixedBuild) : null;
    if (!fixedBuild || !match) {
      countInto(skipped, 'remediation_other_build');
      continue;
    }
    const productIds = asArray(remediation.ProductID)
      .map(asString)
      .filter((id): id is string => id !== undefined && products.has(id));
    if (productIds.length === 0) {
      countInto(skipped, 'remediation_not_windows');
      continue;
    }
    const kb = asString(asObject(remediation.Description)?.Value);
    if (!kb || !KB_NUMBER.test(kb)) {
      countInto(skipped, 'remediation_bad_kb');
      continue;
    }
    const subType = asString(remediation.SubType);
    const hotpatch = subType === HOTPATCH_SUB_TYPE;
    const supersedes = (asString(remediation.Supercedence) ?? '')
      .split(/[\s,]+/)
      .filter((token) => KB_NUMBER.test(token))
      .slice(0, MAX_SUPERSEDED_KBS);
    for (const productId of productIds) {
      const key = `${productId}|${kb}|${fixedBuild}|${hotpatch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        cve,
        productId,
        kb,
        fixedBuild,
        build: Number(match[1]),
        ubr: Number(match[2]),
        hotpatch,
        subType: subType === undefined ? undefined : truncateText(subType, 64),
        supersedes,
      });
    }
  }
  if (rows.length === before) return;
  const title = asString(asObject(vulnerability.Title)?.Value);
  cves.push({
    id: cve,
    title: title === undefined ? undefined : truncateText(title, MAX_TITLE_CHARS),
    cvss: pickCvss(asArray(vulnerability.CVSSScoreSets), new Set(products.keys())),
  });
};

/**
 * Reduces one monthly CVRF document, streamed from `input`, to Windows advisory rows. Throws
 * when the source is over `maxBytes` or the deadline, aborts, is not complete JSON, is XML, has
 * data after the root object, has no `DocumentTracking`, or lists vulnerabilities before its
 * product tree (without the tree the Windows rows cannot be told apart). That order is read
 * from the key order of the finished document, so slicing cannot change the result.
 */
export const parseMsrcCvrf = async (
  input: AsyncIterable<Uint8Array> | Uint8Array,
  {
    signal,
    timeoutMs = MSRC_PARSE_TIMEOUT_MS,
    maxBytes = MAX_FEED_BYTES,
  }: ParseMsrcCvrfOptions = {}
): Promise<MsrcCvrfResult> => {
  const guard = startGuard(timeoutMs, signal);
  const balance = newBalance();
  const rows: MsrcAdvisoryRow[] = [];
  const cves: MsrcCve[] = [];
  const skipped: Record<string, number> = {};
  let products: Map<string, string> | undefined;
  let tracking: Json | undefined;
  try {
    const batches = await parseInBatches(
      boundedChunks(input, maxBytes, balance, guard),
      JSONLoader,
      { json: { jsonpaths: ['$.Vulnerability'] }, metadata: true, batchSize: 50 }
    );
    for await (const batch of batches) {
      if (batch.batchType === 'data') {
        if (!products) throw new Error(PRODUCT_TREE_LAST);
        for (const vulnerability of asArray(batch.data)) {
          reduceVulnerability(vulnerability, products, rows, cves, skipped);
        }
        continue;
      }
      const container = asObject(batch.container);
      if (!container) continue;
      if (batch.batchType === 'final-result') {
        const keys = Object.keys(container);
        const vulnerabilities = keys.indexOf('Vulnerability');
        const tree = keys.indexOf('ProductTree');
        if (tree > vulnerabilities && vulnerabilities >= 0) {
          throw new Error(PRODUCT_TREE_LAST);
        }
      }
      products =
        products ?? (container.ProductTree ? buildProducts(container.ProductTree) : undefined);
      tracking = asObject(container.DocumentTracking) ?? tracking;
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // The streaming parser's own errors carry a multi-line position dump.
    throw error.message.startsWith('MSRC CVRF')
      ? error
      : new Error(`MSRC CVRF is not valid JSON: ${error.message.split('\n')[0]}`);
  } finally {
    guard.dispose();
  }
  if (!isComplete(balance)) throw new Error('MSRC CVRF is cut off before its closing bracket');
  const identification = asObject(asObject(tracking?.Identification)?.ID);
  const documentId = asString(identification?.Value);
  if (!documentId) throw new Error('MSRC CVRF has no DocumentTracking identification');
  return {
    documentId,
    currentReleaseDate: asString(tracking?.CurrentReleaseDate),
    rows,
    cves,
    products: products?.size ?? 0,
    skipped,
  };
};

/**
 * The months in the `updates` index. IDs that are not a plain `YYYY-Mon` token (`2017-May-B`,
 * `2018-FEB`) are skipped, as are Mariner (Azure Linux) release-note entries: a month token
 * is only ever built from a validated ID, never from raw feed text.
 */
export const parseMsrcUpdatesIndex = (body: Uint8Array): MsrcUpdatesIndexResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString('utf8')
    );
  } catch (error) {
    throw new Error(`MSRC updates index is not valid JSON: ${(error as Error).message}`);
  }
  const value = asObject(parsed)?.value;
  if (!Array.isArray(value)) throw new Error('MSRC updates index has no value array');
  const months: MsrcUpdatesIndexEntry[] = [];
  const skipped: Record<string, number> = {};
  for (const item of value) {
    const entry = asObject(item);
    const id = asString(entry?.ID);
    if (!id || !isMsrcMonth(id)) {
      countInto(skipped, 'updates_invalid_month_id');
      continue;
    }
    const title = asString(entry?.DocumentTitle);
    if (title !== undefined && !/security updates?/i.test(title)) {
      countInto(skipped, 'updates_not_security_updates');
      continue;
    }
    months.push({ id, currentReleaseDate: asString(entry?.CurrentReleaseDate) });
  }
  return { months, skipped };
};
