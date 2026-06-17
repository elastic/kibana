/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';
import { DEMO_DATA_BOOTSTRAPPING_SETTING_ID } from '../common/ui_settings';

/**
 * uiSettings definitions for Observability Onboarding.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [DEMO_DATA_BOOTSTRAPPING_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.observability_onboarding.demoDataBootstrappingEnabledName', {
      defaultMessage: 'Demo data & Observability bootstrapping',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability_onboarding.demoDataBootstrappingEnabledDescription',
      {
        defaultMessage:
          'Show a section on the Add data page to set up recommended alerts, SLOs, and ML jobs, and to ingest synthetic demo data. Intended for demos and local development.',
      }
    ),
    schema: schema.boolean(),
    requiresPageReload: true,
    solutionViews: ['classic', 'oblt'],
    technicalPreview: true,
  },
};
