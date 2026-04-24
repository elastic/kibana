/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { SigeventsOverview } from '../../components/sigevents_overview';
import { SignificantEventDetailBody } from '../../components/sigevents_overview/significant_event_detail_body';
import type { SignificantEventDetailFields } from '../../components/sigevents_overview/significant_event_detail_body';
import { SignificantEventDetailHeader } from '../../components/sigevents_overview/significant_event_detail_header';

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

const DEFAULT_DETAIL_EVENT: SignificantEventDetailFields = {
  id: 'main-significant-event',
  label:
    'Dropped payments on oteldemo.com and video streams on otelfix.com due to unavailable Auth Service',
  subtitle: 'logs · checkout',
  severityLabel: 'Critical',
  severityColor: 'danger',
};

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { agentBuilder } = services;

  const [isDetailFlyoutOpen, setIsDetailFlyoutOpen] = useState(false);
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'sigeventsDetailFlyout' });

  const openDetailFlyout = useCallback(() => setIsDetailFlyoutOpen(true), []);
  const closeDetailFlyout = useCallback(() => setIsDetailFlyoutOpen(false), []);

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
              <SigeventsOverview onViewDetails={openDetailFlyout} />
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

      {isDetailFlyoutOpen ? (
        <EuiFlyout
          type="push"
          side="right"
          size={620}
          paddingSize="m"
          onClose={closeDetailFlyout}
          aria-labelledby={flyoutHeadingId}
          data-test-subj="obltSigeventsDetailFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <div id={flyoutHeadingId}>
              <SignificantEventDetailHeader
                title={DEFAULT_DETAIL_EVENT.label}
                severityLabel={DEFAULT_DETAIL_EVENT.severityLabel}
                severityColor={DEFAULT_DETAIL_EVENT.severityColor}
              />
            </div>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventDetailBody event={DEFAULT_DETAIL_EVENT} hideHeader />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </ObservabilityPageTemplate>
  );
}
