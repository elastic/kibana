/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { type SuggestedPrompt } from '../../../common/prompts';
import { AnalyticsEvents } from '../../analytics/constants';
import { useSuggestedPrompts } from '../../hooks/use_suggested_prompts';
import { useOpenAgentBuilder } from '../../hooks/use_open_agent_builder';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { SuggestedPromptsGrid } from './styles';
import { SuggestedPromptCard } from './suggested_prompt_card';

export const SuggestedPrompts = () => {
  const prompts = useSuggestedPrompts();
  const openAgentBuilder = useOpenAgentBuilder();
  const usageTracker = useUsageTracker();

  const handlePromptClick = (prompt: SuggestedPrompt) => {
    usageTracker.click([
      AnalyticsEvents.startChat,
      AnalyticsEvents.suggestedPrompt,
      `${AnalyticsEvents.suggestedPrompt}-${prompt.id}`,
    ]);
    openAgentBuilder(prompt.prompt);
  };

  return (
    <div css={SuggestedPromptsGrid} data-test-subj="searchGettingStartedSuggestedPrompts">
      {prompts.map((prompt) => (
        <SuggestedPromptCard key={prompt.id} prompt={prompt} onClick={handlePromptClick} />
      ))}
    </div>
  );
};
