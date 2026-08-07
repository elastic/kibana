/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../utils/kibana_react';

const emptyStateWidth = css`
  width: 100%;
  max-width: 640px;
`;

/**
 * Placeholder for the Rules Library feature (not yet built).
 * Reachable only from the Alerts sub-menu — not from Rules hub tabs.
 */
export function RulesLibraryPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    services: { serverless },
  } = useKibana();

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      {
        text: i18n.translate('xpack.observability.alertingIa.breadcrumbs.rulesLibrary', {
          defaultMessage: 'Rules Library',
        }),
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate data-test-subj="observabilityRulesLibraryPage">
      <AppHeader
        title={i18n.translate('xpack.observability.alertingIa.rulesLibrary.title', {
          defaultMessage: 'Rules Library',
        })}
        spacing="largeBleed"
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false} css={emptyStateWidth}>
          <EuiEmptyPrompt
            iconType="aggregate"
            title={
              <h2>
                {i18n.translate('xpack.observability.alertingIa.rulesLibrary.emptyTitle', {
                  defaultMessage: 'Rules Library coming soon',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.observability.alertingIa.rulesLibrary.emptyBody', {
                  defaultMessage:
                    'This is a placeholder in the new Alerting IA prototype. Browse and reuse curated rule templates from here in a future release.',
                })}
              </p>
            }
            actions={
              <EuiButton fill isDisabled>
                {i18n.translate('xpack.observability.alertingIa.rulesLibrary.browse', {
                  defaultMessage: 'Browse templates',
                })}
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
