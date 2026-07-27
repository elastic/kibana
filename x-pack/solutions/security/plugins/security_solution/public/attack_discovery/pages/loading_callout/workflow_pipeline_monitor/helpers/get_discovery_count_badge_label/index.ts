/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PipelineDataResponse } from '../../../../hooks/use_pipeline_data';

const DISCOVERIES_LABEL = (count: number): string =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.discoveriesCountBadge',
    {
      defaultMessage: '{count} {count, plural, one {discovery} other {discoveries}}',
      values: { count },
    }
  );

/** Returns a badge label like "7 discoveries" for the generation step, or null if no data */
export const getGenerationBadgeLabel = (pipelineData: PipelineDataResponse): string | null => {
  if (pipelineData.generation == null) {
    return null;
  }

  return DISCOVERIES_LABEL(pipelineData.generation.attack_discoveries.length);
};

/** Returns a badge label like "5 discoveries" for the validation step, or null if no data */
export const getValidationBadgeLabel = (pipelineData: PipelineDataResponse): string | null => {
  const validated = pipelineData.validated_discoveries;

  if (validated == null) {
    return null;
  }

  return DISCOVERIES_LABEL(validated.length);
};
