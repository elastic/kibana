/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertSummary } from '@kbn/elastic-assistant/impl/alerts/alert_summary';
import { useAIForSOCDetailsContext } from './context';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { AIForSOCDetailsProps } from './types';
import { PanelFooter } from './footer';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { HeaderTitle } from './components/header_title';

export const FLYOUT_BODY_TEST_ID = 'ai-for-soc-alert-flyout-body';

/**
 * Panel to be displayed in AI for SOC alert summary flyout
 */
export const AIForSOCPanel: React.FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { doc } = useAIForSOCDetailsContext();
  console.log('doc ==>', doc);
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>
        <HeaderTitle />
      </FlyoutHeader>
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AlertSummary alertId={doc.id} />
          </EuiFlexItem>
          <EuiFlexItem>{'Recommended action'}</EuiFlexItem>
          <EuiFlexItem>{'Highlighted fields'}</EuiFlexItem>
          <EuiFlexItem>{'Attack Discovery'}</EuiFlexItem>
          <EuiFlexItem>{'AI Assistant'}</EuiFlexItem>
          <EuiFlexItem>{'Suggested prompts'}</EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutBody>
      <PanelFooter />
    </>
  );
});
AIForSOCPanel.displayName = 'AIForSOCPanel';
