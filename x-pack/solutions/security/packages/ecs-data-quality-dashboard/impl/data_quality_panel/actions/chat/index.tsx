/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { NewChat, useFindPrompts } from '@kbn/elastic-assistant';
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
import { getFormattedCheckTime } from '../../data_quality_details/indices_details/pattern/index_check_flyout/utils/get_formatted_check_time';

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
  checkedAt?: number;
}

const ChatActionComponent: FC<Props> = ({ indexName, markdownComment, checkedAt }) => {
  const chatTitle = useMemo(() => {
    const checkedAtFormatted = getFormattedCheckTime(checkedAt);
    return checkedAt && indexName ? `${indexName} - ${checkedAtFormatted}` : checkedAtFormatted;
  }, [checkedAt, indexName]);

  const styles = useStyles();
  const { isAssistantEnabled, httpFetch, toasts } = useDataQualityContext();
  const {
    data: { prompts },
  } = useFindPrompts({
    context: {
      isAssistantEnabled,
      httpFetch,
      toasts,
    },
    params: {
      prompt_group_id: 'aiAssistant',
      prompt_ids: ['dataQualityAnalysis'],
    },
  });
  const getPromptContext = useCallback(async () => markdownComment, [markdownComment]);

  const suggestedUserPrompt = useMemo(
    () =>
      prompts.find(({ promptId }) => promptId === 'dataQualityAnalysis')?.prompt ??
      DATA_QUALITY_SUGGESTED_USER_PROMPT,
    [prompts]
  );

  return (
    <NewChat
      asLink={true}
      category="data-quality-dashboard"
      conversationTitle={chatTitle ?? DATA_QUALITY_DASHBOARD_CONVERSATION_ID}
      description={DATA_QUALITY_PROMPT_CONTEXT_PILL(indexName)}
      getPromptContext={getPromptContext}
      suggestedUserPrompt={suggestedUserPrompt}
      tooltip={DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP}
      isAssistantEnabled={isAssistantEnabled}
      iconType={null}
    >
      <span css={styles.linkText} data-testid="newChatLink">
        <AssistantIcon />
        {ASK_ASSISTANT}
      </span>
    </NewChat>
  );
};

ChatActionComponent.displayName = 'ChatActionComponent';

export const ChatAction = React.memo(ChatActionComponent);
