/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SignificantEventsDiscoveryIllustration } from './significant_events_discovery_illustration';

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={true}
      data-test-subj="obltSigeventsOverviewPageHeader"
      pageSectionProps={{
        grow: true,
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        },
      }}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="center"
        direction="column"
        gutterSize="none"
        css={css`
          flex: 1 1 auto;
          width: 100%;
          min-height: var(--kbn-application--content-height);
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiEmptyPrompt
            hasShadow
            color="plain"
            icon={<SignificantEventsDiscoveryIllustration />}
            data-test-subj="obltSigeventsOverviewPlaceholder"
            title={
              <h2>
                {i18n.translate('xpack.observability.sigeventsOverview.emptyState.title', {
                  defaultMessage: 'Observability Status page',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.observability.sigeventsOverview.emptyState.body', {
                  defaultMessage:
                    'This page will show status, active significant events, impacted entities and other related information. It will also allow for a conversation with context.',
                })}
              </p>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
