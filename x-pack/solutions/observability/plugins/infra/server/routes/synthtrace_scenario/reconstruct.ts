/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  Scrubber,
  collectNumericLeaves,
  collectStringLeaves,
  isPlainObject,
} from '@kbn/synthtrace-scenario-codegen';

export type InfraCapturedSource = Record<string, unknown>;

/** A numeric leaf or a nested object of numeric leaves (used for `system.load`). */
export type NumericTree = number | { [key: string]: NumericTree };

/** A captured field value: a number, a string dimension, or a nested object of those. */
export type FieldValue = number | string | { [key: string]: FieldValue };

/** The data schema a captured document belongs to. */
export type InfraSchema = 'ecs' | 'semconv';

/**
 * The `infra.host(...)` metricsets we can regenerate, keyed by the metricbeat/system
 * `metricset.name`. We no longer enumerate per-builder fields: every numeric field present on a
 * captured document is preserved verbatim (see `collectNumericLeaves`), so the replayed metrics are
 * a faithful copy of the source instead of a hardcoded subset. The map only tells us which
 * metricsets are supported and which `infra.host(...)` builder method routes each one.
 */
export const HOST_METRIC_BUILDERS: Record<string, { method: string }> = {
  cpu: { method: 'cpu' },
  memory: { method: 'memory' },
  network: { method: 'network' },
  filesystem: { method: 'filesystem' },
  diskio: { method: 'diskio' },
  load: { method: 'load' },
  core: { method: 'core' },
};

export interface HostRef {
  /** The resolved (possibly anonymized) host name used in the scenario. */
  name: string;
  /** The generated variable name bound to `infra.host(name)`. */
  varName: string;
  /**
   * Host-constant metadata (OS, cloud provider/region/account, architecture, ip, ...) captured
   * verbatim from the source documents and applied to every replayed doc for this host, so the
   * Hosts view renders identical metadata. Host-name-derived values are scrubbed alongside the name.
   */
  metadata: Record<string, string>;
}

export interface HostMetricSample {
  /** Index into the reconstructed `hosts` array. */
  hostIndex: number;
  /** Whether this document is an ECS (metricbeat/system) or semconv (OTel hostmetrics) metric. */
  schema: InfraSchema;
  /** The metricset (e.g. `cpu`); for ECS it selects the `infra.host(...)` builder method. */
  method: string;
  /** Captured fields. ECS: numeric only, via `.overrides`. Semconv: numeric + string dimensions. */
  fields: Record<string, FieldValue>;
  /** Offset (ms) of this sample from the capture's earliest document. */
  offsetMs: number;
}

export interface ReconstructedInfra {
  hosts: HostRef[];
  samples: HostMetricSample[];
  startMs: number;
  endMs: number;
  documentCount: number;
}

export interface ReconstructOptions {
  /** When true, host names are replaced with deterministic synthetic labels. */
  scrub?: boolean;
  /**
   * Scrub map shared across captures so the same raw value maps to the same synthetic value
   * everywhere (e.g. a host captured both as host metrics and APM data yields a single synthetic
   * host name). Defaults to a fresh, capture-local scrubber.
   */
  scrubber?: Scrubber;
}

/**
 * Reads a value from an OTel `resource.attributes` / `attributes` map, whose keys are stored as
 * literal dotted strings (e.g. `resource.attributes` is a nested object containing the single key
 * `"host.name"`). A plain `get(source, 'resource.attributes.host.name')` fails because lodash splits
 * on every dot, so we fetch the map object and index it by the literal key.
 */
const getDottedKey = (
  source: InfraCapturedSource,
  mapPath: string,
  key: string
): string | undefined => {
  const map = get(source, mapPath);
  if (!isPlainObject(map)) return undefined;
  const value = map[key];
  const unwrapped = Array.isArray(value) ? value[0] : value;
  return typeof unwrapped === 'string' ? unwrapped : undefined;
};

const getString = (source: InfraCapturedSource, path: string): string | undefined => {
  // OTel `_source` is inconsistent: ECS-style fields (`data_stream.dataset`) are nested objects,
  // but `resource.attributes.*` / `attributes.*` are often stored as literal dotted keys. Try the
  // literal key first, then fall back to a nested lookup. Keyword values can also arrive wrapped in
  // a single-element array, so unwrap that too.
  const literal = (source as Record<string, unknown>)[path];
  let value: unknown = literal !== undefined ? literal : get(source, path);
  if (Array.isArray(value)) {
    value = value[0];
  }
  return typeof value === 'string' ? value : undefined;
};

const toEpochMs = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Resolves the metric "kind" (cpu/memory/...) from `metricset.name` when present, else from
 * the last segment of the dataset (`event.dataset`/`data_stream.dataset`, e.g. `system.cpu`).
 */
const resolveMetricset = (source: InfraCapturedSource): string | undefined => {
  const metricsetName = getString(source, 'metricset.name');
  if (metricsetName) return metricsetName;
  const dataset =
    getString(source, 'event.dataset') ?? getString(source, 'data_stream.dataset') ?? '';
  const segment = dataset.split('.').pop();
  return segment || undefined;
};

/**
 * Classifies a document's schema. OTel hostmetrics land in an `*otel*` dataset (e.g.
 * `hostmetricsreceiver.otel`) and use semconv field/dimension names; everything else we treat as
 * ECS (metricbeat/system module). Returns `undefined` for documents we can't regenerate.
 */
const classifySchema = (source: InfraCapturedSource): InfraSchema | undefined => {
  const dataset =
    getString(source, 'data_stream.dataset') ?? getString(source, 'event.dataset') ?? '';
  if (dataset.includes('otel')) {
    return 'semconv';
  }
  const metricset = resolveMetricset(source);
  return metricset !== undefined && HOST_METRIC_BUILDERS[metricset] !== undefined
    ? 'ecs'
    : undefined;
};

/** Sets `value` at a dotted `path`, always creating plain-object nodes (never arrays for `'1'`). */
const setPath = (target: Record<string, NumericTree>, path: string, value: number): void => {
  const parts = path.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = node[part];
    if (!isPlainObject(next)) {
      node[part] = {};
    }
    node = node[part] as Record<string, NumericTree>;
  }
  node[parts[parts.length - 1]] = value;
};

/**
 * The synthtrace `host.load()` builder emits `system.load` as a nested object (`{ 1, cores }`),
 * so we must fold any captured `system.load.*` leaves back into that nested shape. Mixing the
 * object value with flat `system.load.1` override keys in the same document would make Elasticsearch
 * reject it ("field defined more than once").
 */
const foldSystemLoad = (flat: Record<string, number>): Record<string, NumericTree> => {
  const result: Record<string, NumericTree> = {};
  const load: Record<string, NumericTree> = {};
  let hasLoad = false;
  const prefix = 'system.load.';
  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith(prefix)) {
      hasLoad = true;
      setPath(load, key.slice(prefix.length), value);
    } else {
      result[key] = value;
    }
  }
  if (hasLoad) {
    result['system.load'] = load;
  }
  return result;
};

/**
 * The single top-level dimension alias that doesn't match its `attributes.*` key: the Hosts view and
 * the synthtrace `semconvHost` builder read `device.keyword`, while OTel stores it as
 * `attributes.device`. Every other dimension keeps its name, so we no longer enumerate them.
 */
const DIMENSION_ALIASES: Record<string, string> = {
  device: 'device.keyword',
};

/**
 * Collects every OTel per-sample dimension (`state`/`direction`/`device`/`mode`/...) from a
 * captured document, regardless of how the source stored the `attributes` map: nested
 * (`attributes: { state: 'idle' }`) or as literal dotted keys (`'attributes.state': 'idle'`).
 * Returned keyed by the bare attribute name (e.g. `state`), so the caller can emit both the
 * top-level alias and the literal `attributes.*` path. Replaces the old hand-maintained dimension
 * allowlist so any dimension a future metric introduces is preserved automatically.
 */
const collectAttributeDimensions = (source: InfraCapturedSource): Record<string, string> => {
  const dimensions: Record<string, string> = {};
  const map = get(source, 'attributes');
  if (isPlainObject(map)) {
    for (const [key, value] of Object.entries(collectStringLeaves(map))) {
      dimensions[key] = value;
    }
  }
  for (const [key, value] of Object.entries(source)) {
    if (!key.startsWith('attributes.')) continue;
    const unwrapped = Array.isArray(value) ? value[0] : value;
    if (typeof unwrapped === 'string') {
      dimensions[key.slice('attributes.'.length)] = unwrapped;
    }
  }
  return dimensions;
};

/**
 * Translates a native OTel hostmetrics `_source` into the flat field shape the Hosts view (and the
 * synthtrace `semconvHost` builder) read. The metric value lives under `metrics.system.*` (canonical
 * OTel) or, for ECS-compatible collectors (EDOT), directly under `system.*`; the host is under
 * `resource.attributes.host.name` and dimensions under `attributes.*`. Real OTel indices expose the
 * other prefix and top-level dimension names via field aliases, but the Hosts view is inconsistent
 * about which it reads (cpu/memory/network/filesystem/load use `metrics.system.*` + a top-level
 * `state`/`direction`; disk uses the non-prefixed `system.disk.*` + `attributes.direction`).
 * Synthtrace targets define no aliases, so for every captured value we materialize BOTH the
 * `metrics.system.*` and the non-prefixed `system.*` variant (regardless of which the source stored),
 * and for every dimension BOTH the top-level alias and the literal `attributes.*` path. Without this,
 * an aggregation reading the absent variant returns null and the UI silently shows N/A (or, for the
 * CPU snapshot's `1 - sum(idle)`, a misleading 100%).
 *
 * Returns `null` when the document carries no `metrics.*`/`system.*` numeric value.
 */
const buildSemconvFields = (
  source: InfraCapturedSource
): { fields: Record<string, FieldValue>; method: string } | null => {
  const numeric = collectNumericLeaves(source);
  const fields: Record<string, FieldValue> = {};
  let metricKind: string | undefined;

  for (const [key, value] of Object.entries(numeric)) {
    let systemKey: string | undefined;
    if (key.startsWith('metrics.system.')) {
      systemKey = key.slice('metrics.'.length);
    } else if (key.startsWith('system.')) {
      systemKey = key;
    } else {
      continue;
    }
    // Emit both the non-prefixed and `metrics.`-prefixed variant so the Hosts view resolves the
    // value whichever prefix a given formula/snapshot reads.
    fields[systemKey] = value;
    fields[`metrics.${systemKey}`] = value;
    if (!metricKind) metricKind = systemKey;
  }

  if (metricKind === undefined) {
    return null;
  }

  for (const [attribute, value] of Object.entries(collectAttributeDimensions(source))) {
    // Emit both the top-level alias (`state`/`direction`/...) and the literal `attributes.*` path,
    // so dimension filters resolve whichever form a given formula reads (e.g. disk IOPS/throughput
    // filter on `attributes.direction`, while network rx/tx filter on top-level `direction`).
    fields[DIMENSION_ALIASES[attribute] ?? attribute] = value;
    fields[`attributes.${attribute}`] = value;
  }

  const dataset = getString(source, 'data_stream.dataset');
  if (dataset) {
    fields['data_stream.dataset'] = dataset;
  }

  // `system.<kind>.*` -> `<kind>` (cpu/memory/filesystem/network/disk); used only for the description.
  const method = metricKind.split('.')[1];

  return { fields, method: method || 'metric' };
};

/** Exact field paths that are routing/time/name, not host-constant metadata. */
const METADATA_EXACT_EXCLUDE = new Set<string>([
  'host.name',
  'host.hostname',
  'resource.attributes.host.name',
]);

/**
 * Path prefixes excluded from host metadata: metric values (`metrics.`/`system.`), OTel per-sample
 * dimensions (top-level `attributes.` — `state`/`direction`/`device`/...), and routing/time fields.
 * Note `resource.attributes.` is NOT excluded (it carries the host's OS/cloud metadata).
 */
const METADATA_PREFIX_EXCLUDE = [
  'metrics.',
  'system.',
  'attributes.',
  'scope.',
  'data_stream.',
  'event.',
  'metricset.',
];

const isHostMetadataPath = (path: string): boolean =>
  !METADATA_EXACT_EXCLUDE.has(path) &&
  !METADATA_PREFIX_EXCLUDE.some((prefix) => path.startsWith(prefix));

/**
 * OTel `resource.attributes.*` metadata mirrored to the ECS-compatible field names the Hosts view
 * reads (`host.os.name`, `cloud.provider`, ...). Real OTel indices expose these via field aliases,
 * which don't live in `_source`, so the captured document only has the `resource.attributes.*`
 * source; we materialize the alias explicitly so the replayed (alias-less) synthtrace data renders.
 */
const SEMCONV_METADATA_ALIASES: Record<string, string> = {
  'resource.attributes.os.type': 'host.os.name',
  'resource.attributes.os.name': 'host.os.name',
  'resource.attributes.os.version': 'host.os.version',
  'resource.attributes.os.description': 'host.os.full',
  'resource.attributes.host.arch': 'host.architecture',
  'resource.attributes.cloud.provider': 'cloud.provider',
  'resource.attributes.cloud.region': 'cloud.region',
  'resource.attributes.cloud.availability_zone': 'cloud.availability_zone',
  'resource.attributes.cloud.account.id': 'cloud.account.id',
  'resource.attributes.cloud.platform': 'cloud.service.name',
  'resource.attributes.host.type': 'cloud.machine.type',
};

/**
 * Extracts host-constant metadata from a document: all string fields except routing/time/name and
 * per-sample dimensions, plus ECS-compatible aliases synthesized from OTel `resource.attributes.*`.
 */
const collectHostMetadata = (source: InfraCapturedSource): Record<string, string> => {
  const metadata: Record<string, string> = {};
  const strings = collectStringLeaves(source);

  for (const [path, value] of Object.entries(strings)) {
    if (isHostMetadataPath(path)) {
      metadata[path] = value;
    }
  }

  for (const [attrPath, ecsField] of Object.entries(SEMCONV_METADATA_ALIASES)) {
    const value = strings[attrPath];
    if (value !== undefined && metadata[ecsField] === undefined) {
      metadata[ecsField] = value;
    }
  }

  return metadata;
};

/**
 * Reconstructs raw host/system metric `_source` documents into a structured, host-grouped
 * shape ready for codegen. Supports both ECS (metricbeat/system) and semconv (OTel hostmetrics)
 * schemas. Numeric values are preserved verbatim; only host names are (optionally) anonymized.
 * Documents we can't classify, or which carry no numeric fields at all, are dropped.
 */
export const reconstructInfra = (
  docs: InfraCapturedSource[],
  options: ReconstructOptions = {}
): ReconstructedInfra => {
  const { scrub = false } = options;
  const scrubber = options.scrubber ?? new Scrubber();

  const supportedDocs = docs.filter((doc) => classifySchema(doc) !== undefined);

  if (supportedDocs.length === 0) {
    throw new Error(
      'No host metric documents (ECS cpu/memory/network/load/core/filesystem/diskio or semconv OTel hostmetrics) found for the provided capture.'
    );
  }

  // Single pass min/max: `Math.min(...timestamps)` would spread the whole array as call
  // arguments and overflow the stack on large captures.
  let startMs = Infinity;
  let endMs = -Infinity;
  for (const doc of supportedDocs) {
    const ts = toEpochMs(get(doc, '@timestamp'));
    if (ts < startMs) startMs = ts;
    if (ts > endMs) endMs = ts;
  }

  const hostIndexByName = new Map<string, number>();
  const hosts: HostRef[] = [];

  const resolveHostIndex = (rawName: string): number => {
    const name = scrub ? scrubber.label('host', rawName) : rawName;
    const existing = hostIndexByName.get(name);
    if (existing !== undefined) return existing;
    const index = hosts.length;
    hosts.push({ name, varName: `host${index + 1}`, metadata: {} });
    hostIndexByName.set(name, index);
    return index;
  };

  /**
   * Merges a document's host metadata into the host (first value per field wins, for stability).
   * When scrubbing, any value equal to the raw host name is replaced with the scrubbed name, so the
   * guarantee "only the name changes" holds even for name-derived fields (e.g. `agent.name`).
   */
  const mergeHostMetadata = (
    hostIndex: number,
    source: InfraCapturedSource,
    rawName: string
  ): void => {
    const { metadata } = hosts[hostIndex];
    for (const [field, value] of Object.entries(collectHostMetadata(source))) {
      if (metadata[field] !== undefined) continue;
      metadata[field] = scrub && value === rawName ? hosts[hostIndex].name : value;
    }
  };

  const samples: HostMetricSample[] = [];
  for (const source of supportedDocs) {
    const schema = classifySchema(source)!;

    if (schema === 'semconv') {
      // OTel hostmetrics: the host lives under `resource.attributes` keyed by the literal `host.name`.
      const rawHostName =
        getDottedKey(source, 'resource.attributes', 'host.name') ??
        getString(source, 'host.name') ??
        getString(source, 'host.hostname');
      if (!rawHostName) continue;

      const built = buildSemconvFields(source);
      if (!built) continue;

      const hostIndex = resolveHostIndex(rawHostName);
      mergeHostMetadata(hostIndex, source, rawHostName);
      const offsetMs = toEpochMs(get(source, '@timestamp')) - startMs;
      samples.push({ hostIndex, schema, method: built.method, fields: built.fields, offsetMs });
      continue;
    }

    // ECS (metricbeat/system module): the host lives at the top-level `host.name`.
    const rawHostName = getString(source, 'host.name') ?? getString(source, 'host.hostname');
    if (!rawHostName) continue;

    const flat = collectNumericLeaves(source);
    if (Object.keys(flat).length === 0) continue;

    const metricset = resolveMetricset(source) ?? 'metric';
    const hostIndex = resolveHostIndex(rawHostName);
    mergeHostMetadata(hostIndex, source, rawHostName);
    const offsetMs = toEpochMs(get(source, '@timestamp')) - startMs;
    // `load` is folded back into the nested `system.load` object the builder emits, to avoid an
    // object-vs-scalar clash on `system.load` during indexing.
    const fields: Record<string, FieldValue> =
      metricset === 'load' ? foldSystemLoad(flat) : { ...flat };

    samples.push({ hostIndex, schema, method: metricset, fields, offsetMs });
  }

  if (samples.length === 0) {
    throw new Error('No usable host metric samples could be reconstructed from the capture.');
  }

  samples.sort((a, b) => a.offsetMs - b.offsetMs);

  return {
    hosts,
    samples,
    startMs,
    endMs,
    documentCount: supportedDocs.length,
  };
};
