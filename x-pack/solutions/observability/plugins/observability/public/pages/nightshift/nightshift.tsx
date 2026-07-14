/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY } from '@kbn/management-settings-ids';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import { NightshiftApp } from './components/nightshift_app';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';
import { useFetchSignificantEvents } from './hooks/use_fetch_significant_events';

export function NightshiftPage() {
  const {
    agentBuilder,
    application,
    http: { basePath },
    uiSettings,
    serverless,
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
        href: basePath.prepend('/app/observability/nightshift'),
        text: i18n.translate('xpack.observability.breadcrumbs.nightshiftLinkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: 'observability-overview:nightshift',
      },
    ],
    { serverless }
  );

  const { data, error, isLoading } = useFetchSignificantEvents(isEnabled);
  const events = data?.hits ?? [];
  const showAllEventsHref = application.getUrlForApp('streams', {
    deepLinkId: 'significantEventsEvents',
  });

  const handleChatClick = useCallback(
    (event: SignificantEvent) => {
      agentBuilder?.openChat({
        newConversation: true,
        attachments: [
          {
            id: event.event_id,
            type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
            data: event,
          },
        ],
      });
    },
    [agentBuilder]
  );

  useEffect(() => {
    if (!isEnabled) {
      history.replace(OVERVIEW_PATH);
    }
  }, [history, isEnabled]);

  if (!isEnabled) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth="900px"
      pageSectionProps={{
        color: 'subdued',
        contentProps: { style: { minHeight: 'max-content' } },
        restrictWidth: '900px',
      }}
    >
      <NightshiftApp
        error={error ?? undefined}
        events={events}
        isLoading={isLoading}
        onChatClick={agentBuilder ? handleChatClick : undefined}
        showAllEventsHref={showAllEventsHref}
      />
    </ObservabilityPageTemplate>
  );
}
