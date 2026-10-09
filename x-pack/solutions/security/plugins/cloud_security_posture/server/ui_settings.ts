/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';
import { GRAPH_RUNTIME_EVALUATIONS_ENABLED_SETTING } from '../common/constants';

export const cspUiSettings: Record<string, UiSettingsParams> = {
  [GRAPH_RUNTIME_EVALUATIONS_ENABLED_SETTING]: {
    name: i18n.translate('xpack.csp.uiSettings.graphRuntimeEvaluationsEnabledName', {
      defaultMessage: 'Cloud Security graph integration enrichment',
    }),
    value: true,
    description: i18n.translate('xpack.csp.uiSettings.graphRuntimeEvaluationsEnabledDescription', {
      defaultMessage:
        'When enabled, the Security graph enriches event nodes with integration-specific entity classification (actor sub-type, target identity, display names). Disable this setting if the graph returns errors after adding new integrations.',
    }),
    type: 'boolean',
    category: ['securitySolution'],
    requiresPageReload: false,
    schema: schema.boolean(),
    solutionViews: ['classic', 'security'],
  },
};
