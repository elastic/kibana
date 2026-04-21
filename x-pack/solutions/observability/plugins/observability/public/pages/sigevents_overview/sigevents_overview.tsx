/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { SignificantEventsDiscoveryIllustration } from './significant_events_discovery_illustration';

const emptyPromptContainerStyles = css`
  min-height: 340px;
`;

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { agentBuilder } = services;

  const EmbeddableConversation = useMemo(
    () => agentBuilder?.getEmbeddableConversation(),
    [agentBuilder]
  );

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
        direction="column"
        gutterSize="m"
        style={{ height: '100%', minHeight: 0 }}
        data-test-subj="obltSigeventsConversation"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            gutterSize="m"
            css={emptyPromptContainerStyles}
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
        </EuiFlexItem>

        {EmbeddableConversation && (
          <EuiFlexItem grow={true} style={{ minHeight: 0 }}>
            <EmbeddableConversation
              sessionTag="sigevents"
              hideWelcomeTitle
              hideCloseButton
              initialTitle="Systems overview"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
