/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../utils/kibana_react';

/**
 * Observability Inbox — embeds Alerting v2 episodes without leaving for Stack Management.
 */
export function InboxPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    services: { alertingVTwo, serverless },
  } = useKibana();

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.inbox', {
          defaultMessage: 'Inbox',
        }),
      },
    ],
    { serverless }
  );

  const EmbeddedEpisodesList = alertingVTwo?.EmbeddedEpisodesList;

  return (
    <ObservabilityPageTemplate data-test-subj="observabilityAlertsInboxPage">
      {EmbeddedEpisodesList ? (
        <EmbeddedEpisodesList />
      ) : (
        <p>
          {i18n.translate('xpack.observability.alertingIa.inbox.unavailable', {
            defaultMessage: 'Inbox requires Alerting v2 to be enabled.',
          })}
        </p>
      )}
    </ObservabilityPageTemplate>
  );
}
