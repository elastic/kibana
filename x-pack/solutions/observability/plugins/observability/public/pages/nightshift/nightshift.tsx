/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY } from '@kbn/management-settings-ids';
import { NightshiftApp } from '@kbn/nightshift';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

const ONBOARDING_INITIAL_MESSAGE = i18n.translate(
  'xpack.observability.nightshift.onboardingInitialMessage',
  {
    defaultMessage:
      'Start the significant-events-onboarding skill. First check whether there is already memory about my system. If there is, summarise what you know and ask whether I have something specific to add or correct, or whether I want a general review of the gaps. If memory is empty, go straight into gathering information.',
  }
);

export function NightshiftPage() {
  const {
    http,
    uiSettings,
    serverless,
    notifications: { toasts },
    agentBuilder,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();

  const isEnabled = uiSettings.get<boolean>(
    OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
    false
  );

  useBreadcrumbs(
    [
      {
        href: http.basePath.prepend('/app/observability/nightshift'),
        text: i18n.translate('xpack.observability.breadcrumbs.nightshiftLinkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: 'observability-overview:nightshift',
      },
    ],
    { serverless }
  );

  const handleStartOnboarding = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: ONBOARDING_INITIAL_MESSAGE,
      autoSendInitialMessage: true,
    });
  }, [agentBuilder]);

  const [isDetectingGaps, setIsDetectingGaps] = useState(false);

  const handleDetectGaps = useCallback(async () => {
    setIsDetectingGaps(true);
    try {
      await http.post('/internal/streams/memory/_detect_gaps', { body: JSON.stringify({}) });
      toasts.addSuccess(
        i18n.translate('xpack.observability.nightshift.detectGapsQueued', {
          defaultMessage: 'Gap detection queued. Results will appear once the workflow completes.',
        })
      );
    } catch (error) {
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.observability.nightshift.detectGapsError', {
          defaultMessage: 'Failed to trigger gap detection.',
        }),
      });
    } finally {
      setIsDetectingGaps(false);
    }
  }, [http, toasts]);

  if (!isEnabled) {
    history.replace(OVERVIEW_PATH);
    return null;
  }

  return (
    <ObservabilityPageTemplate data-test-subj="nightshiftPage" isEmptyState>
      <NightshiftApp
        agentBuilderAvailable={!!agentBuilder}
        onStartOnboarding={handleStartOnboarding}
        onDetectGaps={handleDetectGaps}
        isDetectingGaps={isDetectingGaps}
      />
    </ObservabilityPageTemplate>
  );
}
