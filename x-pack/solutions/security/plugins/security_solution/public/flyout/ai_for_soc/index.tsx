/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { PromptContext } from '@kbn/elastic-assistant';
import {
  AlertSummary,
  AttackDiscoveryWidget,
  Conversations,
  SuggestedPrompts,
} from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME, TIMESTAMP } from '@kbn/rule-data-utils';
import { AlertSummaryOptionsMenu } from './components/settings_menu';
import { DocumentDetailsProvider } from '../document_details/shared/context';
import { HighlightedFields } from '../document_details/right/components/highlighted_fields';
import { useKibana } from '../../common/lib/kibana';
import { getField } from '../document_details/shared/utils';
import { getRawData } from '../../assistant/helpers';
import { useAIForSOCDetailsContext } from './context';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { AIForSOCDetailsProps } from './types';
import { PanelFooter } from './footer';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { HeaderTitle } from './components/header_title';
import { DEFAULT_AI_CONNECTOR } from '../../../common/constants';
import { UserAssetTableType } from '../../explore/users/store/model';
import { useAlertsContext } from '../../detections/components/alerts_table/alerts_context';

export const FLYOUT_BODY_TEST_ID = 'ai-for-soc-alert-flyout-body';
export const ALERT_SUMMARY_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-alert-summary-section';
export const ATTACK_DISCOVERY_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-attack-discovery-section';
export const AI_ASSISTANT_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-ai-assistant-section';
export const SUGGESTED_PROMPTS_SECTION_TEST_ID =
  'ai-for-soc-alert-flyout-suggested-prompts-section';

const AI_SUMMARY = i18n.translate('xpack.elasticAssistant.alertSummary.aiSummaryTitle', {
  defaultMessage: 'AI summary',
});
const ATTACK_DISCOVERY = i18n.translate(
  'xpack.elasticAssistant.alertSummary.attackDiscovery.title',
  {
    defaultMessage: 'Attack Discovery',
  }
);
const AI_ASSISTANT = i18n.translate('xpack.elasticAssistant.aiAssistant.title', {
  defaultMessage: 'AI Assistant',
});
const SUGGESTED_PROMPTS = i18n.translate('xpack.elasticAssistant.alertSummary.suggestedPrompts', {
  defaultMessage: 'Suggested prompts',
});

/**
 * Panel to be displayed in AI for SOC alert summary flyout
 */
export const AIForSOCPanel: React.FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { eventId, getFieldsData, indexName, dataFormattedForFieldBrowser } =
    useAIForSOCDetailsContext();

  const { capabilities } = useKibana().services.application;
  const canSeeAdvancedSettings = capabilities.management.kibana.settings ?? false;
  const { showAnonymizedValues } = useAlertsContext();
  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser ?? []),
    [dataFormattedForFieldBrowser]
  );
  const promptContext: PromptContext = {
    category: 'alert',
    description: 'Alert summary',
    getPromptContext,
    id: `contextId-${eventId}`,
    // empty as tooltip is only used within Assistant, but in the flyout
    tooltip: '',
  };

  const ruleName = useMemo(() => getField(getFieldsData(ALERT_RULE_NAME)) || '', [getFieldsData]);
  const { uiSettings } = useKibana().services;
  const defaultConnectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
  const timestamp = useMemo(() => getField(getFieldsData(TIMESTAMP)) || '', [getFieldsData]);

  return (
    <>
      <DocumentDetailsProvider
        id={eventId}
        indexName={indexName}
        scopeId={UserAssetTableType.assetOkta}
      >
        <FlyoutNavigation flyoutIsExpandable={false} />
        <FlyoutHeader>
          <HeaderTitle />
        </FlyoutHeader>
        <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem data-test-subj={ALERT_SUMMARY_SECTION_TEST_ID}>
              <EuiFlexGroup justifyContent={'spaceBetween'}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size={'s'}>
                    <h2>{AI_SUMMARY}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AlertSummaryOptionsMenu />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <AlertSummary
                alertId={eventId}
                canSeeAdvancedSettings={canSeeAdvancedSettings}
                defaultConnectorId={defaultConnectorId}
                isContextReady={(dataFormattedForFieldBrowser ?? []).length > 0}
                promptContext={promptContext}
                showAnonymizedValues={showAnonymizedValues}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <HighlightedFields />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={ATTACK_DISCOVERY_SECTION_TEST_ID}>
              <EuiTitle size={'s'}>
                <h2>{ATTACK_DISCOVERY}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <AttackDiscoveryWidget id={eventId} />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={AI_ASSISTANT_SECTION_TEST_ID}>
              <EuiTitle size={'s'}>
                <h2>{AI_ASSISTANT}</h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <Conversations id={eventId} />
            </EuiFlexItem>
            <EuiFlexItem data-test-subj={SUGGESTED_PROMPTS_SECTION_TEST_ID}>
              <EuiTitle size="xxs">
                <h4>{SUGGESTED_PROMPTS}</h4>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <SuggestedPrompts
                getPromptContext={getPromptContext}
                ruleName={ruleName}
                timestamp={timestamp}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FlyoutBody>
        <PanelFooter />
      </DocumentDetailsProvider>
    </>
  );
});
AIForSOCPanel.displayName = 'AIForSOCPanel';
