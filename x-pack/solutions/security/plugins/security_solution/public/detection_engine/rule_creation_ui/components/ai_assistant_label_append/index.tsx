/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewChat, useAssistantContext } from '@kbn/elastic-assistant';

import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { css } from '@emotion/react';
import type { RuleType } from '@kbn/securitysolution-rules';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { DefineStepRule } from '../../../common/types';
import type { FormHook } from '../../../../shared_imports';
import { ALLOWED_FIELDS } from '../../../../assistant/update_field_in_form';

import * as i18n from './translations';

const simpleHoverStyles = css`
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  .euiFormRow:hover & {
    opacity: 1;
  }
`;

const suggestedUserPrompt = `Question: \nGuidelines: Any suggested new values of fields should be wrapped in code block. Follow this guideline in every subsequent response. 
In response, explicitly mention what field was suggested in format [field_name], wrapped in square brackets. Example: Here is a new suggested rule field [description] value: {{suggested value}}\n`;

interface AiAssistantProps {
  getFields: FormHook<DefineStepRule>['getFields'];
  setFieldValue: FormHook<DefineStepRule>['setFieldValue'];
  fieldName: string;
  ruleContext: {
    type: RuleType;
    query?: string;
    index: string[];
  };
  getValue?: () => unknown;
  aiAssistedUserQuery: string;
}

const AiAssistantLabelAppendComponent: React.FC<AiAssistantProps> = ({
  getFields,
  setFieldValue,
  fieldName,
  ruleContext,
  getValue,
  aiAssistedUserQuery,
}) => {
  const promptContextId = `security-solution-ai-assisted-rule-creation-${fieldName}`;
  const { promptContexts, unRegisterPromptContext, registerPromptContext } = useAssistantContext();
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();

  const getPromptContext = useCallback(async () => {
    const field = getFields()[fieldName];
    const fieldValue = getValue ? getValue() : field.value;

    const paramsToStr = Object.entries(ruleContext).reduce((acc, [key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return acc;
      }
      return `${acc}"${key}": "${value}",\n`;
    }, '');

    const errors = field.errors.map((error) => error.message).join(', ');

    return `
Value of field ${fieldName} in Detection rule is "${fieldValue}". \n
${errors ? `Current validation errors on form for this field: "${errors}". \n` : ''}
\n
Additional relevant rule configuration:
\n
${paramsToStr}
    `;
  }, [fieldName, getFields, ruleContext, getValue]);

  const onShowOverlay = useCallback(() => {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.OPEN_ASSISTANT_ON_RULE_QUERY_ERROR);

    Object.keys(promptContexts).forEach((key) => {
      if (
        key.startsWith('security-solution-ai-assisted-rule-creation-') &&
        key !== promptContextId
      ) {
        unRegisterPromptContext(key);
      }
    });

    registerPromptContext({
      id: promptContextId,
      category: 'detection-rules',
      description: i18n.ASK_ASSISTANT_DESCRIPTION,
      getPromptContext,
      tooltip: i18n.ASK_ASSISTANT_TOOLTIP,
      suggestedUserPrompt,
    });
  }, [
    getPromptContext,
    promptContextId,
    promptContexts,
    registerPromptContext,
    unRegisterPromptContext,
  ]);

  const handleOnExportCodeBlock = useCallback(
    (codeBlock: string, suggestedFieldName: string | null) => {
      if (suggestedFieldName === null || !ALLOWED_FIELDS.has(suggestedFieldName)) {
        return;
      }
      // sometimes AI assistant include redundant backtick symbols in code block
      const newValue = codeBlock.replaceAll('`', '');

      if (suggestedFieldName === 'queryBar') {
        const queryField = getFields().queryBar;
        const queryBarValue = queryField.value as DefineStepRule['queryBar'];

        if (queryBarValue.query.query !== codeBlock) {
          setFieldValue('queryBar', {
            ...queryBarValue,
            query: { ...queryBarValue.query, query: codeBlock },
          });
        }
        return;
      }

      const field = getFields()[suggestedFieldName];

      if (field.value !== newValue) {
        setFieldValue(suggestedFieldName, newValue);
      }
    },
    [getFields, setFieldValue]
  );
  const chatTitle = useMemo(() => {
    return `Detection Rules Create form - AI Assisted rule creation - ${aiAssistedUserQuery} - [${fieldName}]`;
  }, [fieldName, aiAssistedUserQuery]);

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
          suggestedUserPrompt={suggestedUserPrompt}
          onExportCodeBlock={handleOnExportCodeBlock}
          promptContextId={promptContextId}
        >
          <AssistantIcon
            size="s"
            css={css`
              vertical-align: inherit;
            `}
          />{' '}
          {i18n.ASK_ASSISTANT_BUTTON}
        </NewChat>
      </EuiToolTip>
    </span>
  );
};

export const AiAssistantLabelAppend = React.memo(AiAssistantLabelAppendComponent);
AiAssistantLabelAppend.displayName = 'AiAssistantLabelAppend';
