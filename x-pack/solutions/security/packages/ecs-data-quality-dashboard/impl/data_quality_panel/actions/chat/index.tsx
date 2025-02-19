/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { NewChat } from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { AssistantIcon } from '@kbn/ai-assistant-icon';
import {
  DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
  DATA_QUALITY_PROMPT_CONTEXT_PILL,
  DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP,
  DATA_QUALITY_SUGGESTED_USER_PROMPT,
} from '../../translations';
import { useDataQualityContext } from '../../data_quality_context';
import { ASK_ASSISTANT } from './translations';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    linkText: css({
      display: 'flex',
      gap: euiTheme.size.xs,
    }),
  };
};

interface Props {
  markdownComment: string;
  indexName: string;
}

const ChatActionComponent: FC<Props> = ({ indexName, markdownComment }) => {
  const styles = useStyles();
  const { isAssistantEnabled } = useDataQualityContext();
  const getPromptContext = useCallback(async () => markdownComment, [markdownComment]);

  return (
    <NewChat
      asLink={true}
      category="data-quality-dashboard"
      conversationId={DATA_QUALITY_DASHBOARD_CONVERSATION_ID}
      description={DATA_QUALITY_PROMPT_CONTEXT_PILL(indexName)}
      getPromptContext={getPromptContext}
      suggestedUserPrompt={DATA_QUALITY_SUGGESTED_USER_PROMPT}
      tooltip={DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP}
      isAssistantEnabled={isAssistantEnabled}
      iconType={null}
    >
      <span css={styles.linkText}>
        <AssistantIcon />
        {ASK_ASSISTANT}
      </span>
    </NewChat>
  );
};

ChatActionComponent.displayName = 'ChatActionComponent';

export const ChatAction = React.memo(ChatActionComponent);
