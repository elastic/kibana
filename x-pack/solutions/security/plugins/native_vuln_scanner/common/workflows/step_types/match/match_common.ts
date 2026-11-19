/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { z, lazySchema } from '@kbn/zod/v4';
import { FETCH_FEED_STATUSES } from '../fetch_feed/fetch_feed_common';

export const MATCH_STEP_TYPE = 'native_vuln.match' as const;

export const matchInputSchema = lazySchema(() =>
  z.object({
    /** The `feeds` output of `native_vuln.fetch_feed`; releases it reports as failed are not retried. */
    feeds: z
      .array(
        z.object({
          release: z.string(),
          status: z.enum(FETCH_FEED_STATUSES),
          url: z.string().optional(),
          error: z.string().optional(),
        })
      )
      .optional(),
  })
);

export const matchOutputSchema = lazySchema(() =>
  z.object({
    hosts: z.number(),
    findings: z.number(),
    fixed: z.number(),
    aborted: z.boolean(),
    pack_missing: z.boolean(),
    releases: z.record(z.string(), z.enum(['matched', 'unavailable', 'failed'])),
    failures: z.record(z.string(), z.string()),
    /** Feed provenance per release: where the feed came from and how old its snapshot was. */
    feed_provenance: z.record(
      z.string(),
      z.object({
        source_url: z.string().optional(),
        snapshot_time: z.string().optional(),
        age_seconds: z.number().optional(),
      })
    ),
    /** Distinct CVE ids among this run's matched findings. */
    distinct_cves: z.number().optional(),
    /** CISA KEV enrichment outcome; `listed` is the findings stamped as known exploited. */
    kev: z
      .object({
        status: z.enum(['ok', 'stale', 'unavailable', 'not_attempted']),
        listed: z.number(),
      })
      .optional(),
  })
);

export type MatchInput = z.infer<typeof matchInputSchema>;
export type MatchOutput = z.infer<typeof matchOutputSchema>;

export const matchStepCommonDefinition: BaseStepDefinition<
  typeof matchInputSchema,
  typeof matchOutputSchema
> = {
  id: MATCH_STEP_TYPE,
  label: i18n.translate('xpack.nativeVulnScanner.workflows.steps.match.label', {
    defaultMessage: 'Match inventory against advisories',
  }),
  description: i18n.translate('xpack.nativeVulnScanner.workflows.steps.match.description', {
    defaultMessage:
      'Reads the osquery software inventory, matches it against the fetched advisory feeds and writes the vulnerability findings. Fails when any OS release fails.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: matchInputSchema,
  outputSchema: matchOutputSchema,
};
