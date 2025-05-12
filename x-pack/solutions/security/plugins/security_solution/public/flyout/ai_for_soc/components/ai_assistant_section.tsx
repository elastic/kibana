/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME, TIMESTAMP } from '@kbn/rule-data-utils';
import { SuggestedPrompts } from './suggested_prompts';
import { getField } from '../../document_details/shared/utils';
import { useAIForSOCDetailsContext } from '../context';
import { Conversations } from './conversations';

export const AI_ASSISTANT_SECTION_TEST_ID = 'ai-for-soc-alert-flyout-ai-assistant-section';
export const SUGGESTED_PROMPTS_SECTION_TEST_ID =
  'ai-for-soc-alert-flyout-suggested-prompts-section';

const AI_ASSISTANT = i18n.translate('xpack.securitySolution.aiAssistantSection.title', {
  defaultMessage: 'AI Assistant',
});
const SUGGESTED_PROMPTS = i18n.translate(
  'xpack.securitySolution.alertSummary.suggestedPromptsSection.title',
  {
    defaultMessage: 'Suggested prompts',
  }
);

export interface AIAssistantSectionProps {
  /**
   * The Elastic AI Assistant will invoke this function to retrieve the context data,
   * which will be included in a prompt (e.g. the contents of an alert or an event)
   */
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
}

/**
 * Panel to be displayed in AI for SOC alert summary flyout
 */
export const AIAssistantSection = memo(({ getPromptContext }: AIAssistantSectionProps) => {
  const { eventId, getFieldsData } = useAIForSOCDetailsContext();

  const ruleName = useMemo(() => getField(getFieldsData(ALERT_RULE_NAME)) || '', [getFieldsData]);
  const timestamp = useMemo(() => getField(getFieldsData(TIMESTAMP)) || '', [getFieldsData]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem data-test-subj={AI_ASSISTANT_SECTION_TEST_ID}>
        <EuiTitle size={'s'}>
          <h2>{AI_ASSISTANT}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <Conversations alertId={eventId} />
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
  );
});

AIAssistantSection.displayName = 'AIAssistantSection';
