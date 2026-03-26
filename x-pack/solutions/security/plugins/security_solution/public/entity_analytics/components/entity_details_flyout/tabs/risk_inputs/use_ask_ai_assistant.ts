/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { type Replacements } from '@kbn/elastic-assistant-common';

import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';

/**
 * This category is provided in the prompt context for the assistant
 */
const category = 'insight';

export const useAskAiAssistant = ({
  title,
  description,
  replacements,
  suggestedPrompt,
  getPromptContext,
}: {
  title: string;
  description: string;
  suggestedPrompt: string;
  getPromptContext: () => Promise<string> | Promise<Record<string, string[]>>;
  replacements?: Replacements;
}) => {
  const { hasAssistantPrivilege, isAssistantEnabled, isAssistantVisible } =
    useAssistantAvailability();

  const { promptContextId, showAssistantOverlay: showOverlay } = useAssistantOverlay(
    category,
    title,
    description,
    getPromptContext,
    null, //  UUID
    suggestedPrompt,
    null, // tooltip
    isAssistantEnabled,
    replacements ?? null
  );

  const showAssistantOverlay = useCallback(() => {
    showOverlay(true);
  }, [showOverlay]);

  const disabled = !hasAssistantPrivilege || !isAssistantVisible || promptContextId == null;

  return useMemo(
    () => ({ promptContextId, disabled, showAssistantOverlay }),
    [promptContextId, disabled, showAssistantOverlay]
  );
};
