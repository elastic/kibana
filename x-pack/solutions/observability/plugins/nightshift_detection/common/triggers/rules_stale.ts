/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Emitted when what the detection rules are built from changed in a space. The registry accepts
 * only letters, digits and dashes before the dot, so the namespace is kebab-case.
 */
export const RULES_STALE_TRIGGER_ID = 'nightshift-detection.rulesStale' as const;

/** The most sources one event names; a write touches far fewer. */
const MAX_SOURCE_IDS = 10_000;
const MAX_SOURCE_ID_LENGTH = 1_024;

const rulesStaleEventSchema = lazySchema(() =>
  z.object({
    reason: z.enum(['knowledge_indicators', 'sources']).describe(
      i18n.translate('xpack.nightshiftDetection.triggers.rulesStale.schema.reason', {
        defaultMessage:
          'What changed: the knowledge indicators of some sources, or the sources themselves.',
      })
    ),
    source_ids: z
      .array(z.string().max(MAX_SOURCE_ID_LENGTH))
      .max(MAX_SOURCE_IDS)
      .describe(
        i18n.translate('xpack.nightshiftDetection.triggers.rulesStale.schema.sourceIds', {
          defaultMessage: 'The sources whose knowledge indicators or settings changed.',
        })
      ),
  })
);

/** The payload of a {@link RULES_STALE_TRIGGER_ID} event. */
export type RulesStaleEvent = z.infer<typeof rulesStaleEventSchema>;

/** Starts the space's rule reconcile workflow. Server only: the plugin has no browser side. */
export const rulesStaleTriggerDefinition: CommonTriggerDefinition<typeof rulesStaleEventSchema> = {
  id: RULES_STALE_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: rulesStaleEventSchema,
  title: i18n.translate('xpack.nightshiftDetection.triggers.rulesStale.title', {
    defaultMessage: 'Nightshift detection - Rules out of date',
  }),
  description: i18n.translate('xpack.nightshiftDetection.triggers.rulesStale.description', {
    defaultMessage:
      'Emitted when the knowledge indicators or the sources of a space change, so the alerting rules of the detection strategies no longer match them.',
  }),
};
