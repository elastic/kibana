/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineDataResponse } from '../../../../hooks/use_pipeline_data';
import * as i18n from '../../translations';

/** Maps a pipeline phase to its inspect button configuration */
export const INSPECT_CONFIG: Readonly<
  Record<
    string,
    {
      dataKey: string;
      hasData: (data: PipelineDataResponse) => boolean;
      testSubj: string;
      tooltip: string;
    }
  >
> = {
  generate_discoveries: {
    dataKey: 'generation',
    hasData: (data) => data.generation != null,
    testSubj: 'inspectGeneration',
    tooltip: i18n.INSPECT_RAW_DISCOVERIES,
  },
  promote_discoveries: {
    dataKey: 'validation',
    hasData: (data) => data.validated_discoveries != null || data.generation != null,
    testSubj: 'inspectValidation',
    tooltip: i18n.INSPECT_VALIDATED_DISCOVERIES,
  },
  retrieve_alerts: {
    dataKey: 'retrieval',
    hasData: (data) => data.combined_alerts != null,
    testSubj: 'inspectAlertRetrieval',
    tooltip: i18n.INSPECT_RAW_ALERTS,
  },
  validate_discoveries: {
    dataKey: 'validation',
    hasData: (data) => data.validated_discoveries != null || data.generation != null,
    testSubj: 'inspectValidation',
    tooltip: i18n.INSPECT_VALIDATED_DISCOVERIES,
  },
};
