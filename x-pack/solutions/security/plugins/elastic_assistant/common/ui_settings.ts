/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

export const ALERT_INVESTIGATION_PIPELINE_ENABLED =
  'elasticAssistant:alertInvestigationPipeline_enabled';

export const uiSettings = {
  [ALERT_INVESTIGATION_PIPELINE_ENABLED]: {
    name: i18n.translate('xpack.elasticAssistant.alertPipeline.featureFlag.name', {
      defaultMessage: 'Alert Investigation Pipeline (Experimental)',
    }),
    value: false, // Disabled by default - spike/PoC
    description: i18n.translate('xpack.elasticAssistant.alertPipeline.featureFlag.description', {
      defaultMessage:
        'Enable automated alert investigation pipeline with deduplication, case matching, and incremental Attack Discovery. ' +
        'This is a spike/proof-of-concept and may be removed or changed in future releases.',
    }),
    category: ['elastic_assistant'],
    schema: schema.boolean(),
    requiresPageReload: true,
    type: 'boolean' as const,
    sensitive: false,
    deprecation: undefined,
  },
};
