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
 * Observability-hosted Alerting v2 rule details — keeps solution Alerts chrome
 * instead of jumping to Stack Management.
 */
export function RulesHubRuleDetailPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    services: { http, serverless, alertingVTwo },
  } = useKibana();

  const rulesListHref = http.basePath.prepend(paths.observability.rulesHub);
  const EmbeddedRuleDetails = alertingVTwo?.EmbeddedRuleDetails;

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.rules', {
          defaultMessage: 'Rules',
        }),
        href: rulesListHref,
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate data-test-subj="observabilityRulesHubRuleDetailPage">
      {EmbeddedRuleDetails ? (
        <EmbeddedRuleDetails
          rulesListHref={rulesListHref}
          episodesListBasePath={paths.observability.inbox}
        />
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.observability.alertingIa.rulesHub.v2UnavailableTitle', {
            defaultMessage: 'Alerting v2 is not available',
          })}
          color="warning"
        >
          <p>
            {i18n.translate('xpack.observability.alertingIa.rulesHub.v2UnavailableBody', {
              defaultMessage: 'Enable Alerting v2 to manage ES|QL-native rules from this hub.',
            })}
          </p>
        </EuiCallOut>
      )}
    </ObservabilityPageTemplate>
  );
}
