/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** STIX SDO types that become threat reports (unknown types are skipped). */
export const STIX_REPORTABLE_TYPES = [
  'indicator',
  'malware',
  'malware-analysis',
  'threat-actor',
  'intrusion-set',
  'campaign',
  'attack-pattern',
  'course-of-action',
  'tool',
  'vulnerability',
  'report',
  'note',
  'opinion',
] as const;

export type StixReportableType = (typeof STIX_REPORTABLE_TYPES)[number];

const REPORTABLE_SET: ReadonlySet<string> = new Set(STIX_REPORTABLE_TYPES);

export interface StixObject {
  type: string;
  id: string;
  name?: string;
  description?: string;
  pattern?: string;
  pattern_type?: string;
  labels?: string[];
  created?: string;
  modified?: string;
  /** STIX 2.x `report` SDO. Carries the human-readable narrative. */
  abstract?: string;
  /** Some vendor STIX dialects ship `summary`. */
  summary?: string;
  // Allow arbitrary extra fields without forcing every consumer to cast.
  [key: string]: unknown;
}

export interface ExtractedStixObject {
  object: StixObject;
}

const isReportableSdo = (obj: unknown): obj is StixObject => {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Partial<StixObject>;
  if (typeof candidate.type !== 'string' || typeof candidate.id !== 'string') return false;
  return REPORTABLE_SET.has(candidate.type);
};

export const splitStixBundle = (raw: unknown): ExtractedStixObject[] =>
  extractObjects(raw)
    .filter(isReportableSdo)
    .map((object) => ({ object }));

const extractObjects = (raw: unknown): unknown[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];
  const bundle = raw as Record<string, unknown>;
  if (Array.isArray(bundle.objects)) return bundle.objects;
  // Some TAXII servers return a bare object array without an `objects` envelope.
  if (bundle.type === 'bundle' && Array.isArray(bundle.objects)) return bundle.objects;
  return [];
};

export const composeStixBody = (object: StixObject): string => {
  const parts: string[] = [];
  if (typeof object.description === 'string' && object.description.length > 0) {
    parts.push(object.description);
  }
  if (typeof object.abstract === 'string' && object.abstract.length > 0) {
    parts.push(object.abstract);
  }
  if (typeof object.summary === 'string' && object.summary.length > 0) {
    parts.push(object.summary);
  }
  if (object.type === 'indicator' && typeof object.pattern === 'string') {
    const patternType = typeof object.pattern_type === 'string' ? object.pattern_type : 'stix';
    parts.push(`Pattern (${patternType}): ${object.pattern}`);
  }
  if (Array.isArray(object.labels) && object.labels.length > 0) {
    parts.push(`Labels: ${object.labels.join(', ')}`);
  }
  if (parts.length === 0) {
    return `STIX ${object.type} ${object.id}`;
  }
  return parts.join('\n\n');
};

/** Display title — `name` when present, otherwise `<type> <id>`. */
export const composeStixTitle = (object: StixObject): string => {
  if (typeof object.name === 'string' && object.name.trim().length > 0) {
    return object.name;
  }
  return `${object.type} ${object.id}`;
};
