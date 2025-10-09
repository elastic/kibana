/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewChat } from '@kbn/elastic-assistant';

import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { css } from '@emotion/react';
import type { RuleType } from '@kbn/securitysolution-rules';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { DefineStepRule } from '../../../common/types';
import type { FormHook, ValidationError } from '../../../../shared_imports';

import * as i18n from './translations';

const simpleHoverStyles = css`
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  .euiFormRow:hover & {
    opacity: 1;
  }
`;

const getRelevantRuleContext = () => {};
const getLanguageName = (language: string | undefined) => {
  let modifiedLanguage = language;
  if (language === 'eql') {
    modifiedLanguage = 'EQL(Event Query Language)';
  }
  if (language === 'esql') {
    modifiedLanguage = 'ES|QL(The Elasticsearch Query Language)';
  }

  return modifiedLanguage;
};

const retrieveErrorMessages = (errors: ValidationError[]): string =>
  errors
    .flatMap(({ message, messages }) => [message, ...(Array.isArray(messages) ? messages : [])])
    .join(', ');

interface AiAssistantProps {
  getFields: FormHook<DefineStepRule>['getFields'];
  setFieldValue: FormHook<DefineStepRule>['setFieldValue'];
  fieldName: string;
  ruleContext: {
    type: RuleType;
    query?: string;
    index: string;
  };
}

const AiAssistantLabelAppendComponent: React.FC<AiAssistantProps> = ({
  getFields,
  setFieldValue,
  fieldName,
  ruleContext,
}) => {
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();

  const getPromptContext = useCallback(async () => {
    const field = getFields()[fieldName];
    const paramsToStr = Object.entries(ruleContext).reduce((acc, [key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return acc;
      }
      return `${acc}${key}: ${value}\n`;
    }, '');

    return `Value of field ${fieldName} in Detection rule is "${field.value}". \n
    Additional relevant rule configuration:
    ${paramsToStr}
    `;
  }, [fieldName, getFields, ruleContext]);

  const onShowOverlay = useCallback(() => {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.OPEN_ASSISTANT_ON_RULE_QUERY_ERROR);
  }, []);

  const handleOnExportCodeBlock = useCallback(
    (codeBlock: string) => {
      const field = getFields()[fieldName];

      console.log;
      // sometimes AI assistant include redundant backtick symbols in code block
      const newValue = codeBlock.replaceAll('`', '');
      if (field.value !== newValue) {
        setFieldValue(fieldName, newValue);
      }
    },
    [fieldName, getFields, setFieldValue]
  );
  const chatTitle = useMemo(() => {
    console.log('fields list', getFields());
    // const queryField = getFields().queryBar;
    // const { query } = (queryField.value as DefineStepRule['queryBar']).query;
    // return `${i18n.DETECTION_RULES_CREATE_FORM_CONVERSATION_ID} - ${query ?? 'query'}`;

    return `Detection Rules Create form - AI Assisted rule creation - ${fieldName}`;
  }, [fieldName, getFields]);

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <span css={simpleHoverStyles}>
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.createRule.aiAssistantLabelAppendTooltipContent"
            defaultMessage="Get AI assistance to help with this rule field."
          />
        }
        position="top"
      >
        <NewChat
          asLink={true}
          category="detection-rules"
          conversationTitle={chatTitle}
          description={i18n.ASK_ASSISTANT_DESCRIPTION}
          getPromptContext={getPromptContext}
          tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
          iconType={null}
          onShowOverlay={onShowOverlay}
          isAssistantEnabled={isAssistantEnabled}
          suggestedUserPrompt={`Question: \nGuidelines: Any suggested new values of fields should be wrapped in code block. Follow this guideline in every subsequent response.\n`}
          onExportCodeBlock={handleOnExportCodeBlock}
        >
          <AssistantIcon
            size="s"
            css={css`
              vertical-align: inherit;
            `}
          />
        </NewChat>
      </EuiToolTip>
    </span>
  );
};

export const AiAssistantLabelAppend = React.memo(AiAssistantLabelAppendComponent);
AiAssistantLabelAppend.displayName = 'AiAssistantLabelAppend';
