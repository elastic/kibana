/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * uiSettings definitions for the logs_data_access plugin.
 */
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_ENABLE_LOGS_STREAM } from '@kbn/management-settings-ids';

export const uiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_ENABLE_LOGS_STREAM]: {
    category: ['observability'],
    name: i18n.translate('xpack.infra.enableLogsStream', {
      defaultMessage: 'Logs Stream',
    }),
    value: false,
    description: i18n.translate('xpack.infra.enableLogsStreamDescription', {
      defaultMessage: 'Enables the legacy Logs Stream application and dashboard panel. ',
    }),
    deprecation: {
      message: i18n.translate('xpack.infra.enableLogsStreamDeprecationWarning', {
        defaultMessage:
          'Logs Stream is deprecated, and this setting will be removed in Kibana 9.0.',
      }),
      docLinksKey: 'generalSettings',
    },
    type: 'boolean',
    schema: schema.boolean(),
    requiresPageReload: true,
  },
};
