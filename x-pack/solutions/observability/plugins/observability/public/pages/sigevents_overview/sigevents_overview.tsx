/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { SigeventsOverview } from '../../components/sigevents_overview';

const MAX_CONTENT_WIDTH = 900;

const containerStyles = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-height: 0;
`;

const contentColumnStyles = css`
  width: 100%;
  max-width: ${MAX_CONTENT_WIDTH}px;
  height: 100%;
  min-height: 0;
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
      <div css={containerStyles}>
        <div css={contentColumnStyles}>
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            style={{ height: '100%', minHeight: 0 }}
            data-test-subj="obltSigeventsConversation"
          >
            <EuiFlexItem grow={false}>
              <SigeventsOverview />
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
        </div>
      </div>
    </ObservabilityPageTemplate>
  );
}
