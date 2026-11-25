/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';
import { REMOTE_INDEX_TARGETS_MAX_LENGTH } from '../remote_index_targets';

export const REMOTE_INDEX_TARGETS_STEP_ID = 'alertzero.resolveRemoteIndexTargets' as const;

const MAX_LOCAL_PATTERNS = 20;
const MAX_LOCAL_PATTERN_LENGTH = 256;
const MAX_CLUSTERS = 200;

const inputSchema = lazySchema(() =>
  z.object({
    patterns: z
      .array(z.string().min(1).max(MAX_LOCAL_PATTERN_LENGTH))
      .min(1)
      .max(MAX_LOCAL_PATTERNS)
      .describe(
        'Local index patterns the step reads. Each remote cluster alias in the space default data view gets the same patterns, prefixed with the alias.'
      ),
  })
);

const outputSchema = lazySchema(() =>
  z.object({
    index: z
      .string()
      .min(1)
      .max(REMOTE_INDEX_TARGETS_MAX_LENGTH)
      .describe(
        'Comma-separated search target: the local patterns, then one entry per remote cluster and pattern.'
      ),
    clusters: z
      .array(z.string().max(MAX_LOCAL_PATTERN_LENGTH))
      .max(MAX_CLUSTERS)
      .describe(
        'The remote cluster aliases the target searches. Empty when the search stays local.'
      ),
    incomplete: z
      .boolean()
      .describe(
        'True when the target leaves out remote clusters or patterns the data view names: the data view could not be read or used in full, or the length cap dropped some. False for a data view that names none, or whose clusters are all searched or excluded.'
      ),
  })
);

export const remoteIndexTargetsStepCommonDefinition: CommonStepDefinition<
  typeof inputSchema,
  typeof outputSchema
> = {
  id: REMOTE_INDEX_TARGETS_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.remoteIndexTargets.label', {
    defaultMessage: 'Resolve remote index targets',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.remoteIndexTargets.description', {
    defaultMessage:
      "Builds a search target for the given local index patterns, plus the same patterns on each remote cluster named by the space's Security default data view.",
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
};
