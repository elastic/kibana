/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Spike-canonical Daybreak contract shapes. PND-local compatible copy until
// #17942 ratifies. Matches daybreak-spike server/common/schemas field names.

import { z } from '@kbn/zod/v4';
import { DAYBREAK_EVIDENCE_SCHEMA_VERSION } from './versions';

/** Canonical Daybreak EvidencePackage (spike-compatible). */
export const evidencePackageSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  kind: z.enum(['alert', 'hunt', 'forensic', 'correlation']),
  sourceRef: z.string().optional(),
  summary: z.string(),
  provenance: z.enum(['capability', 'analyst', 'system']),
  confidence: z.number().min(0).max(1),
  stance: z.enum(['for', 'against', 'mixed']),
  limitations: z.array(z.string()).optional(),
  sensitivityLabel: z.enum(['public', 'internal', 'restricted']),
  createdAt: z.string(),
  alertId: z.string().optional(),
  tactics: z.array(z.string()).optional(),
});
export type EvidencePackage = z.infer<typeof evidencePackageSchema>;

export interface BuildEvidenceArgs {
  id: string;
  kind?: EvidencePackage['kind'];
  sourceRef?: string;
  summary: string;
  confidence?: number;
  stance?: EvidencePackage['stance'];
  alertId?: string;
  tactics?: string[];
  limitations?: string[];
}

/** Build an EvidencePackage from a worker run's enriched ground-truth block. */
export const buildEvidencePackageFromWorkerRun = (args: BuildEvidenceArgs): EvidencePackage =>
  evidencePackageSchema.parse({
    id: args.id,
    schemaVersion: DAYBREAK_EVIDENCE_SCHEMA_VERSION,
    kind: args.kind ?? 'alert',
    sourceRef: args.sourceRef,
    summary: args.summary,
    provenance: 'capability',
    confidence: args.confidence ?? 0.5,
    stance: args.stance ?? 'for',
    limitations: args.limitations,
    sensitivityLabel: 'internal',
    createdAt: new Date().toISOString(),
    alertId: args.alertId,
    tactics: args.tactics,
  });
