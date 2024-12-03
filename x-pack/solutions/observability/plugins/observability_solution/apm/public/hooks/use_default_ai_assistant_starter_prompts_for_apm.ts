/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import type { ApmPluginStartDeps } from '../plugin';

export function useDefaultAiAssistantStarterPromptsForAPM({
  hasApmData,
  hasApmIntegrations,
  noDataConfig,
}: {
  hasApmData: boolean;
  hasApmIntegrations: boolean;
  noDataConfig?: NoDataConfig;
}) {
  const { observabilityAIAssistant } = useKibana<ApmPluginStartDeps>().services;

  let screenDescription = '';

  if (!hasApmData && !hasApmIntegrations) {
    screenDescription =
      'The user does not have the APM integration installed and does not have APM data.';
  } else {
    screenDescription = hasApmData ? 'The user has APM data.' : 'The user does not have APM data.';
    screenDescription = hasApmIntegrations
      ? `${screenDescription} The user has the APM integration installed.`
      : `${screenDescription} The user does not have the APM integration installed.`;
  }

  if (noDataConfig !== undefined) {
    screenDescription = `${screenDescription} The user is looking at a screen that tells them they do not have any data.`;
  }

  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription,
      starterPrompts: [
        ...(hasApmData
          ? []
          : [
              {
                title: i18n.translate('xpack.apm.aiAssistant.starterPrompts.explainNoData.title', {
                  defaultMessage: 'Explain',
                }),
                prompt: i18n.translate(
                  'xpack.apm.aiAssistant.starterPrompts.explainNoData.prompt',
                  { defaultMessage: "Why don't I see any data?" }
                ),
                icon: 'sparkles',
              },
            ]),
      ],
    });
  }, [
    hasApmData,
    hasApmIntegrations,
    noDataConfig,
    screenDescription,
    observabilityAIAssistant?.service,
  ]);
}
