/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PromptContext } from '@kbn/elastic-assistant';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';

const ALERT_FROM_FLYOUT = i18n.translate('xpack.securitySolution.alertSummary.alertFromFlyout', {
  defaultMessage: 'Alert (from flyout)',
});
const PROMPT_1_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt1Title', {
  defaultMessage: 'Detailed Alert Analysis',
});
const PROMPT_1_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt1Description',
  {
    defaultMessage: 'Dive deeper into what happened with this alert.',
  }
);
const PROMPT_1_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt1Prompt', {
  defaultMessage:
    "Provide a thorough breakdown of this alert, including the attack technique, potential impact, and risk assessment. Explain the technical details in a way that's immediately actionable",
});
const PROMPT_2_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt2Title', {
  defaultMessage: 'Best practices for noisy alerts',
});
const PROMPT_2_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt2Description',
  {
    defaultMessage: 'Find Related Threat Intelligence Articles from Elastic Security Labs.',
  }
);
const PROMPT_2_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt2Prompt', {
  defaultMessage:
    'Can you provide relevant Elastic Security Labs intelligence about the threat indicators or techniques in this alert? Include any known threat actors, campaigns, or similar attack patterns documented in ESL research.',
});
const PROMPT_3_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt3Title', {
  defaultMessage: 'Alert Remediation Strategy',
});
const PROMPT_3_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt3Description',
  {
    defaultMessage: 'Generate Step-by-Step Remediation Plan.',
  }
);
const PROMPT_3_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt3Prompt', {
  defaultMessage:
    'Based on this alert, please outline a comprehensive remediation plan including immediate containment steps, investigation actions, and long-term mitigation strategies to prevent similar incidents.',
});
const SUGGESTED_PROMPTS_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummary.suggestedPromptsContextTooltip',
  {
    defaultMessage: 'Add this alert as context.',
  }
);

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
    prompt: PROMPT_1_PROMPT,
    title: PROMPT_1_TITLE,
    description: PROMPT_1_DESCRIPTION,
  },
  {
    icon: 'cloudStormy',
    prompt: PROMPT_2_PROMPT,
    title: PROMPT_2_TITLE,
    description: PROMPT_2_DESCRIPTION,
  },
  {
    icon: 'database',
    prompt: PROMPT_3_PROMPT,
    title: PROMPT_3_TITLE,
    description: PROMPT_3_DESCRIPTION,
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
        description: ALERT_FROM_FLYOUT,
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
    SUGGESTED_PROMPTS_CONTEXT_TOOLTIP,
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
