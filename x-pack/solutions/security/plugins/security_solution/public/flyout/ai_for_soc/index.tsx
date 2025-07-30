/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibanaFeatureFlags } from '../../attack_discovery/pages/use_kibana_feature_flags';
import { getRawData } from '../../assistant/helpers';
import { AIAssistantSection } from './components/ai_assistant_section';
import { AttackDiscoverySection } from './components/attack_discovery_section';
import { AlertSummarySection } from './components/alert_summary_section';
import { HighlightedFields } from '../document_details/right/components/highlighted_fields';
import { useAIForSOCDetailsContext } from './context';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { AIForSOCDetailsProps } from './types';
import { PanelFooter } from './footer';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { HeaderTitle } from './components/header_title';

export const FLYOUT_BODY_TEST_ID = 'ai-for-soc-alert-flyout-body';
export const ATTACK_DISCOVERY_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-attack-discovery-section';

/**
 * Panel to be displayed in AI for SOC alert summary flyout
 */
export const AIForSOCPanel: React.FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { dataFormattedForFieldBrowser, investigationFields } = useAIForSOCDetailsContext();

  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser),
    [dataFormattedForFieldBrowser]
  );
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>
        <HeaderTitle />
      </FlyoutHeader>
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AlertSummarySection getPromptContext={getPromptContext} />
          </EuiFlexItem>
          <EuiFlexItem>
            <HighlightedFields
              dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
              investigationFields={investigationFields}
              showCellActions={false}
            />
          </EuiFlexItem>
          {attackDiscoveryAlertsEnabled && (
            <EuiFlexItem>
              <AttackDiscoverySection />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <AIAssistantSection getPromptContext={getPromptContext} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutBody>
      <PanelFooter />
    </>
  );
});

AIForSOCPanel.displayName = 'AIForSOCPanel';
