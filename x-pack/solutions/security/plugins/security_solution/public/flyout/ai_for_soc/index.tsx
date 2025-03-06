/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertSummary } from '@kbn/elastic-assistant/impl/alerts/alert_summary';
import type { PromptContext } from '@kbn/elastic-assistant';
import { getRawData } from '../../assistant/helpers';
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
export const AIForSOCPanel: React.FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { dataFormattedForFieldBrowser } = useAIForSOCDetailsContext();
  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser ?? []),
    [dataFormattedForFieldBrowser]
  );
  const promptContext: PromptContext = {
    category: 'alert',
    description: 'Alert summary',
    getPromptContext,
    id: '_promptContextId',
    suggestedUserPrompt: '_suggestedUserPrompt',
    tooltip: '_tooltip',
  };
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>{'AI for SOC'}</FlyoutHeader>
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AlertSummary
              isReady={(dataFormattedForFieldBrowser ?? []).length > 0}
              promptContext={promptContext}
            />
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
