/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** One Hunt session attachment per Investigation. */
export const HUNT_SESSION_ATTACHMENT_ID = 'hunt-session';

/** The attachment document may not exceed this many UTF-8 JSON bytes, uncompressed. */
export const HUNT_SESSION_ATTACHMENT_MAX_BYTES = 1024 * 1024;
export const HUNT_SESSION_MAX_ROWS_PER_PRESERVATION = 50;
export const HUNT_SESSION_MAX_FINGERPRINTS = 500;
export const HUNT_SESSION_MAX_FIELDS_PER_ROW = 30;
export const HUNT_SESSION_MAX_FILTERS = 50;
export const HUNT_SESSION_MAX_NOTE_LENGTH = 2000;
export const HUNT_SESSION_MAX_FILTERS_BYTES = 8 * 1024;

const scalar = lazySchema(() => z.union([z.string().max(1024), z.number(), z.boolean(), z.null()]));

const evidenceRow = lazySchema(() =>
  z
    .record(z.string().max(256), scalar)
    .refine((row) => Object.keys(row).length <= HUNT_SESSION_MAX_FIELDS_PER_ROW, {
      message: `A row stores at most ${HUNT_SESSION_MAX_FIELDS_PER_ROW} fields`,
    })
);

const filters = lazySchema(() =>
  z
    .array(z.record(z.string().max(256), scalar))
    .max(HUNT_SESSION_MAX_FILTERS)
    .refine((value) => Buffer.byteLength(JSON.stringify(value)) <= HUNT_SESSION_MAX_FILTERS_BYTES, {
      message: `Filters may not exceed ${HUNT_SESSION_MAX_FILTERS_BYTES} bytes`,
    })
);

const timeRange = lazySchema(() =>
  z.strictObject({ from: z.string().max(64), to: z.string().max(64) })
);

const sessionState = {
  query: lazySchema(() => z.string().max(20_000)),
  filters,
  timeRange,
  columns: lazySchema(() => z.array(z.string().max(256)).max(30)),
  dataViewId: lazySchema(() => z.string().max(256)),
};

const citation = lazySchema(() =>
  z.strictObject({
    kind: z.literal('raw_event'),
    index: z.string().max(256),
    id: z.string().max(512),
  })
);

/**
 * The durable record of a Hunt session on an Investigation, independent of the 90-day workflow
 * execution. Manual sessions carry immutable preservation entries and the latest resume snapshot;
 * automated ones carry the adjudication. A later human append onto an automated Investigation adds
 * the manual parts and sets `has_manual_append`.
 */
export const huntSessionAttachmentSchema = lazySchema(() =>
  z
    .strictObject({
      version: z.literal(1),
      definition: z.strictObject({
        id: z.string().min(1).max(64),
        version: z.number().int().min(1),
        name: z.string().min(1).max(120),
        hypothesis: z.string().min(1).max(4000),
      }),
      trigger: z.enum(['manual', 'automated']),
      has_manual_append: z.boolean(),
      /** Counter owned by AlertZero: 1 on create, +1 on every successful write. */
      revision: z.number().int().min(1),
      /** The Investigation this attachment belongs to, so a renderer can act on it. */
      investigation_id: z.string().min(1).max(256).optional(),
      /** Set when the request that created the Investigation wrote this attachment first. */
      creation_operation_id: z.string().min(1).max(64).optional(),
      preservations: z
        .array(
          z.strictObject({
            preservation_id: z.string().min(1).max(64),
            actor: z.string().max(256),
            timestamp: z.string().max(64),
            /** Context the analyst wrote when preserving. */
            note: z.string().max(HUNT_SESSION_MAX_NOTE_LENGTH).optional(),
            ...sessionState,
            evidenceFingerprints: z.array(z.string().max(256)).max(50),
            selectedEvidence: z.array(evidenceRow).max(HUNT_SESSION_MAX_ROWS_PER_PRESERVATION),
          })
        )
        .optional(),
      resumeSnapshot: z.strictObject(sessionState).optional(),
      adjudication: z
        .strictObject({
          group_id: z.string().max(64),
          summary: z.string().max(4000),
          severity: z.string().max(32),
          hypotheses: z.array(z.string().max(1000)).max(10),
          citations: z.array(citation).max(100),
          executionWindow: timeRange,
          query: z.string().max(20_000),
        })
        .optional(),
    })
    .superRefine((value, ctx) => {
      const isManual = value.trigger === 'manual' || value.has_manual_append;
      if (isManual && (!value.preservations || !value.resumeSnapshot)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Manual sessions need preservations and a resume snapshot',
        });
      }
      if (value.trigger === 'automated' && !value.adjudication) {
        ctx.addIssue({ code: 'custom', message: 'Automated sessions need an adjudication' });
      }
      const fingerprints = (value.preservations ?? []).flatMap(
        (preservation) => preservation.evidenceFingerprints
      );
      if (new Set(fingerprints).size > HUNT_SESSION_MAX_FINGERPRINTS) {
        ctx.addIssue({
          code: 'custom',
          message: `An Investigation stores at most ${HUNT_SESSION_MAX_FINGERPRINTS} evidence fingerprints`,
        });
      }
    })
);

export type HuntSessionAttachment = z.infer<typeof huntSessionAttachmentSchema>;
