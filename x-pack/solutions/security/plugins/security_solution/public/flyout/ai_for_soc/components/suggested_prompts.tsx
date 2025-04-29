/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import type { PromptContext } from '@kbn/elastic-assistant';
import * as i18n from '../constants/translations';

interface Props {
  getPromptContext: PromptContext['getPromptContext'];
  ruleName: string;
  timestamp: string;
}

interface Prompt {
  icon: string;
  prompt: string;
  title: string;
  description: string;
}

// TODO update this copy, waiting on James Spiteri's input
const prompts: Prompt[] = [
  {
    icon: 'bullseye',
    prompt: i18n.PROMPT_1_PROMPT,
    title: i18n.PROMPT_1_TITLE,
    description: i18n.PROMPT_1_DESCRIPTION,
  },
  {
    icon: 'cloudStormy',
    prompt: i18n.PROMPT_2_PROMPT,
    title: i18n.PROMPT_2_TITLE,
    description: i18n.PROMPT_2_DESCRIPTION,
  },
  {
    icon: 'database',
    prompt: i18n.PROMPT_3_PROMPT,
    title: i18n.PROMPT_3_TITLE,
    description: i18n.PROMPT_3_DESCRIPTION,
  },
];
export const SuggestedPrompts = memo(({ getPromptContext, ruleName, timestamp }: Props) => {
  const {
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  const [promptOverlay, setPromptOverlay] = useState<Omit<Prompt, 'icon'> | null>(null);

  const onClick = useCallback(
    (prompt: Prompt) => {
      setPromptOverlay({
        title: `${prompt.title}: ${ruleName} - ${timestamp}`,
        description: i18n.ALERT_FROM_FLYOUT,
        prompt: prompt.prompt,
      });
    },
    [ruleName, timestamp]
  );

  const { showAssistantOverlay } = useAssistantOverlay(
    'alert',
    promptOverlay?.title ?? '',
    promptOverlay?.description ?? '',
    getPromptContext,
    null,
    promptOverlay?.prompt ?? '',
    i18n.SUGGESTED_PROMPTS_CONTEXT_TOOLTIP,
    isAssistantEnabled
  );

  useEffect(() => {
    if (promptOverlay !== null) {
      showAssistantOverlay(true);
    }
  }, [promptOverlay, showAssistantOverlay]);

  return (
    <>
      {prompts.map((prompt, index) => (
        <EuiPanel
          css={css`
            margin: ${euiTheme.size.xs} 0;
          `}
          key={index}
          paddingSize="m"
          hasBorder
        >
          <EuiButtonEmpty
            onClick={() => onClick(prompt)}
            flush="both"
            color="text"
            iconType={prompt.icon}
            css={css`
              svg {
                inline-size: 40px;
                block-size: 40px;
                padding-inline: 10px;
                background: ${euiTheme.colors.backgroundBaseDisabled};
                border-radius: 5px;
              }
            `}
          >
            {prompt.description}
          </EuiButtonEmpty>
        </EuiPanel>
      ))}
    </>
  );
});

SuggestedPrompts.displayName = 'SuggestedPrompt';
