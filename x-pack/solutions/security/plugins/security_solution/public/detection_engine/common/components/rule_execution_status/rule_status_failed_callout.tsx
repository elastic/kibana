/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { EuiCallOut, EuiCodeBlock, EuiSpacer } from '@elastic/eui';

import { NewChat } from '@kbn/elastic-assistant';
import { FormattedDate } from '../../../../common/components/formatted_date';
import type { RuleExecutionStatus } from '../../../../../common/api/detection_engine/rule_monitoring';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine/rule_monitoring';

import * as i18n from './translations';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

interface RuleStatusFailedCallOutProps {
  ruleNameForChat: string;
  ruleName?: string | undefined;
  dataSources?: string[] | undefined;
  date: string;
  message: string;
  status?: RuleExecutionStatus | null;
}

const RuleStatusFailedCallOutComponent: React.FC<RuleStatusFailedCallOutProps> = ({
  ruleName,
  ruleNameForChat,
  dataSources,
  date,
  message,
  status,
}) => {
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const { shouldBeDisplayed, color, title } = getPropsByStatus(status);
  const getPromptContext = useCallback(
    async () =>
      ruleName != null && dataSources != null
        ? `Rule name: ${ruleName}\nData sources: ${dataSources}\nError message: ${message}`
        : `Error message: ${message}`,
    [message, ruleName, dataSources]
  );

  const chatTitle = useMemo(() => {
    return `${ruleNameForChat} - ${title} ${date}`;
  }, [date, title, ruleNameForChat]);

  if (!shouldBeDisplayed) {
    return null;
  }

  return (
    <div
      css={css`
        pre {
          margin-right: 24px; // Otherwise the copy button overlaps the scrollbar
          padding-inline-end: 0;
        }
      `}
    >
      <EuiCallOut
        title={
          <>
            {title} <FormattedDate value={date} fieldName="execution_summary.last_execution.date" />
          </>
        }
        color={color}
        iconType="warning"
        data-test-subj="ruleStatusFailedCallOut"
      >
        <EuiCodeBlock
          className="eui-fullWidth"
          paddingSize="none"
          isCopyable
          overflowHeight={96}
          transparentBackground
        >
          {message}
        </EuiCodeBlock>
        {hasAssistantPrivilege && (
          <NewChat
            category="detection-rules"
            color={color}
            conversationTitle={chatTitle}
            description={i18n.ASK_ASSISTANT_DESCRIPTION}
            getPromptContext={getPromptContext}
            suggestedUserPrompt={i18n.ASK_ASSISTANT_USER_PROMPT}
            tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
            isAssistantEnabled={isAssistantEnabled}
          >
            {i18n.ASK_ASSISTANT_ERROR_BUTTON}
          </NewChat>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </div>
  );
};

export const RuleStatusFailedCallOut = React.memo(RuleStatusFailedCallOutComponent);
RuleStatusFailedCallOut.displayName = 'RuleStatusFailedCallOut';

interface HelperProps {
  shouldBeDisplayed: boolean;
  color: 'danger' | 'warning';
  title: string;
}

const getPropsByStatus = (status: RuleExecutionStatus | null | undefined): HelperProps => {
  switch (status) {
    case RuleExecutionStatusEnum.failed:
      return {
        shouldBeDisplayed: true,
        color: 'danger',
        title: i18n.ERROR_CALLOUT_TITLE,
      };
    case RuleExecutionStatusEnum['partial failure']:
      return {
        shouldBeDisplayed: true,
        color: 'warning',
        title: i18n.PARTIAL_FAILURE_CALLOUT_TITLE,
      };
    default:
      return {
        shouldBeDisplayed: false,
        color: 'warning',
        title: '',
      };
  }
};
