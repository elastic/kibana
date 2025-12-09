/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewChat } from '@kbn/elastic-assistant';

import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { css } from '@emotion/react';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { DefineStepRule } from '../../../common/types';
import type { FormHook, ValidationError } from '../../../../shared_imports';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';

import * as i18n from './translations';

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
  language?: string | undefined;
}

const AiAssistantComponent: React.FC<AiAssistantProps> = ({
  getFields,
  setFieldValue,
  language,
}) => {
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();

  const languageName = getLanguageName(language);

  const getPromptContext = useCallback(async () => {
    const queryField = getFields().queryBar;
    const { query } = (queryField.value as DefineStepRule['queryBar']).query;

    if (!query) {
      return '';
    }

    if (queryField.errors.length === 0) {
      return `No errors in ${languageName} language query detected. Current query: ${query.trim()}`;
    }

    return `${languageName} language query written for Elastic Security Detection rules: \"${query.trim()}\"
returns validation error on form: \"${retrieveErrorMessages(queryField.errors)}\"
Fix ${languageName} language query and give an example of it in markdown format that can be copied.
Proposed solution should be valid and must not contain new line symbols (\\n)`;
  }, [getFields, languageName]);

  const onShowOverlay = useCallback(() => {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.OPEN_ASSISTANT_ON_RULE_QUERY_ERROR);
  }, []);

  const handleOnExportCodeBlock = useCallback(
    (codeBlock: string) => {
      const queryField = getFields().queryBar;
      const queryBar = queryField.value as DefineStepRule['queryBar'];

      // sometimes AI assistant include redundant backtick symbols in code block
      const newQuery = codeBlock.replaceAll('`', '');
      if (queryBar.query.query !== newQuery) {
        setFieldValue('queryBar', {
          ...queryBar,
          query: { ...queryBar.query, query: newQuery },
        });
      }
    },
    [getFields, setFieldValue]
  );
  const chatTitle = useMemo(() => {
    const queryField = getFields().queryBar;
    const { query } = (queryField.value as DefineStepRule['queryBar']).query;
    return `${i18n.DETECTION_RULES_CREATE_FORM_CONVERSATION_ID} - ${query ?? 'query'}`;
  }, [getFields]);

  const isAgentBuilderEnabled = useIsExperimentalFeatureEnabled('agentBuilderEnabled');
  const attachmentData = useMemo(() => {
    const queryField = getFields().queryBar;
    const { query } = (queryField.value as DefineStepRule['queryBar']).query;
    return { text: JSON.stringify({ query: query ?? '', queryLanguage: language }) };
  }, [getFields, language]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.rule,
    attachmentData,
    attachmentPrompt: i18n.ASK_ASSISTANT_USER_PROMPT(languageName),
  });

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />

      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.askAssistantHelpText"
        defaultMessage="{AiAssistantNewChatLink} to help resolve this error."
        values={{
          AiAssistantNewChatLink: isAgentBuilderEnabled ? (
            <NewAgentBuilderAttachment onClick={openAgentBuilderFlyout} size="xs" />
          ) : (
            <NewChat
              asLink={true}
              category="detection-rules"
              conversationTitle={chatTitle}
              description={i18n.ASK_ASSISTANT_DESCRIPTION}
              getPromptContext={getPromptContext}
              suggestedUserPrompt={i18n.ASK_ASSISTANT_USER_PROMPT(languageName)}
              tooltip={i18n.ASK_ASSISTANT_TOOLTIP}
              iconType={null}
              onShowOverlay={onShowOverlay}
              isAssistantEnabled={isAssistantEnabled}
              onExportCodeBlock={handleOnExportCodeBlock}
            >
              <AssistantIcon
                size="s"
                css={css`
                  vertical-align: inherit;
                `}
              />
              {i18n.ASK_ASSISTANT_ERROR_BUTTON}
            </NewChat>
          ),
        }}
      />
    </>
  );
};

export const AiAssistant = React.memo(AiAssistantComponent);
AiAssistant.displayName = 'AiAssistant';
