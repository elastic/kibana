/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import {
  aiAssistantFunctionCallingMode,
  aiAssistantSearchConnectorIndexPattern,
} from '@kbn/observability-ai-assistant-plugin/common';
import { FunctionCallingModeEnum } from './function_calling_mode';

export const uiSettings: Record<string, UiSettingsParams> = {
  [aiAssistantFunctionCallingMode]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.functionCallingModeLabel',
      {
        defaultMessage: 'Function calling mode',
      }
    ),
    value: FunctionCallingModeEnum.Auto,
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.functionCallingModeDescription',
      {
        defaultMessage:
          '<em>[technical preview]</em> Select a mode: Auto chooses the best option based on the connector, Native requires API support, and Simulated does not need API support for functions or tools, but it may impact performance.',
        values: {
          em: (chunks) => `<em>${chunks}</em>`,
        },
      }
    ),
    schema: schema.oneOf(
      [
        schema.literal(FunctionCallingModeEnum.Auto),
        schema.literal(FunctionCallingModeEnum.Native),
        schema.literal(FunctionCallingModeEnum.Simulated),
      ],
      { defaultValue: FunctionCallingModeEnum.Auto }
    ),
    options: [
      FunctionCallingModeEnum.Auto,
      FunctionCallingModeEnum.Native,
      FunctionCallingModeEnum.Simulated,
    ],
    type: 'select',
    optionLabels: {
      [FunctionCallingModeEnum.Auto]: i18n.translate(
        'xpack.observabilityAiAssistantManagement.functionCallingModeValueAuto',
        { defaultMessage: 'Auto (default)' }
      ),
      [FunctionCallingModeEnum.Native]: i18n.translate(
        'xpack.observabilityAiAssistantManagement.functionCallingModeValueNative',
        { defaultMessage: 'Native' }
      ),
      [FunctionCallingModeEnum.Simulated]: i18n.translate(
        'xpack.observabilityAiAssistantManagement.functionCallingModeValueSimulated',
        { defaultMessage: 'Simulated' }
      ),
    },
    requiresPageReload: true,
  },
  [aiAssistantSearchConnectorIndexPattern]: {
    category: ['observability'],
    name: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsTab.h3.searchConnectorIndexPatternLabel',
      { defaultMessage: 'Search connector index pattern' }
    ),
    value: '',
    description: i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.searchConnectorIndexPatternDescription',
      {
        defaultMessage:
          'Index pattern used by the AI Assistant when querying search connectors indices (part of the knowledge base). By default the index for every search connector will be queried',
      }
    ),
    schema: schema.string(),
    type: 'string',
    requiresPageReload: true,
  },
};
