/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../../common/locators/paths';

/**
 * Observability-hosted Alerting v2 episode details — keeps Alerts chrome
 * instead of jumping to Stack Management.
 */
export function InboxEpisodeDetailPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    services: { http, serverless, alertingVTwo },
  } = useKibana();

  const episodesListHref = http.basePath.prepend(paths.observability.inbox);
  const EmbeddedEpisodeDetails = alertingVTwo?.EmbeddedEpisodeDetails;

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
        href: episodesListHref,
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate data-test-subj="observabilityInboxEpisodeDetailPage">
      {EmbeddedEpisodeDetails ? (
        <EmbeddedEpisodeDetails
          episodesListHref={episodesListHref}
          getEpisodeDetailsHref={(episodeId) =>
            http.basePath.prepend(paths.observability.inboxEpisodeDetails(episodeId))
          }
          getRuleDetailsHref={(ruleId) =>
            http.basePath.prepend(paths.observability.rulesHubRuleDetails(ruleId))
          }
        />
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.observability.alertingIa.inbox.v2UnavailableTitle', {
            defaultMessage: 'Alerting v2 is not available',
          })}
          color="warning"
        >
          <p>
            {i18n.translate('xpack.observability.alertingIa.inbox.v2UnavailableBody', {
              defaultMessage: 'Enable Alerting v2 to view alert episodes in Inbox.',
            })}
          </p>
        </EuiCallOut>
      )}
    </ObservabilityPageTemplate>
  );
}
