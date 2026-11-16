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

export const FETCH_FEED_STEP_TYPE = 'native_vuln.fetch_feed' as const;

export const fetchFeedInputSchema = lazySchema(() => z.object({}));

export const FETCH_FEED_STATUSES = ['downloaded', 'not_modified', 'unavailable', 'failed'] as const;

/** One OS release the inventory needs a vendor feed for. Never carries advisory data. */
export const fetchedFeedSchema = lazySchema(() =>
  z.object({
    /** `family:version`, e.g. `ubuntu:noble`. */
    release: z.string(),
    status: z.enum(FETCH_FEED_STATUSES),
    hosts: z.number(),
    url: z.string().optional(),
    etag: z.string().optional(),
    last_modified: z.string().optional(),
    /** Compressed bytes held on the server for the match step. */
    bytes: z.number().optional(),
    error: z.string().optional(),
  })
);

export type FetchedFeed = z.infer<typeof fetchedFeedSchema>;

export const fetchFeedOutputSchema = lazySchema(() =>
  z.object({
    feeds: z.array(fetchedFeedSchema),
    hosts: z.number(),
    pack_missing: z.boolean(),
  })
);

export type FetchFeedInput = z.infer<typeof fetchFeedInputSchema>;
export type FetchFeedOutput = z.infer<typeof fetchFeedOutputSchema>;

export const fetchFeedStepCommonDefinition: BaseStepDefinition<
  typeof fetchFeedInputSchema,
  typeof fetchFeedOutputSchema
> = {
  id: FETCH_FEED_STEP_TYPE,
  label: i18n.translate('xpack.nativeVulnScanner.workflows.steps.fetchFeed.label', {
    defaultMessage: 'Fetch vulnerability advisory feeds',
  }),
  description: i18n.translate('xpack.nativeVulnScanner.workflows.steps.fetchFeed.description', {
    defaultMessage:
      'Downloads the vendor advisory feed for every OS release in the osquery software inventory and reports per-release status. Advisory data stays on the server.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: fetchFeedInputSchema,
  outputSchema: fetchFeedOutputSchema,
};
