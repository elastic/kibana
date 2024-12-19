/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { DEFAULT_ALLOWED_LOGS_BASE_PATTERNS } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID } from '@kbn/management-settings-ids';

/**
 * uiSettings definitions for Logs Explorer.
 */
export const uiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.logsExplorer.allowedDataViews', {
      defaultMessage: 'Logs Explorer allowed data views',
    }),
    value: DEFAULT_ALLOWED_LOGS_BASE_PATTERNS,
    description: i18n.translate('xpack.logsExplorer.allowedDataViewsDescription', {
      defaultMessage:
        'A list of base patterns to match and explore data views in Logs Explorer. Remote clusters will be automatically matched for the provided base patterns.',
    }),
    deprecation: {
      message: i18n.translate('xpack.logsExplorer.allowedDataViewsDeprecationWarning', {
        defaultMessage:
          'Logs Explorer is deprecated, and this setting will be removed in Kibana 9.0.',
      }),
      docLinksKey: 'generalSettings',
    },
    type: 'array',
    schema: schema.arrayOf(schema.string()),
    requiresPageReload: true,
  },
};
