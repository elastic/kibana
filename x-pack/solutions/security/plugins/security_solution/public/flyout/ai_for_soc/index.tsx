/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertSummary } from '@kbn/elastic-assistant/impl/alerts/alert_summary';
import { useAIForSOCDetailsContext } from './context';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { AIForSOCDetailsProps } from './types';
import { PanelFooter } from './footer';
import { FLYOUT_BODY_TEST_ID } from './test_ids';
import { FlyoutHeader } from '../shared/components/flyout_header';

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const AIForSOCPanel: FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { doc } = useAIForSOCDetailsContext();
  console.log('doc ==>', doc);
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>{'AI for SOC'}</FlyoutHeader>
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
