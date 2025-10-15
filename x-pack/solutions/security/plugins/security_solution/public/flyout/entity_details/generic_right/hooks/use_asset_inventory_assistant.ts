/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { PROMPT_CONTEXT_ASSET_CATEGORY } from '../../../../assistant/content/prompt_contexts';
import {
  ENTITY_SUMMARY_CONVERSATION_ID,
  ENTITY_SUMMARY_CONTEXT_DESCRIPTION,
  ENTITY_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  SUMMARY_VIEW,
} from '../../shared/translations';

// Fallback implementation when assistant is not available
const useAssistantNoop = () => ({
  promptContextId: undefined,
  showAssistantOverlay: (show: boolean) => {},
});

export interface UseAssetInventoryAssistantParams {
  entityId: EntityEcs['id'];
  entityFields: Record<string, string[]>;
  isPreviewMode: boolean;
}

export interface UseAssetInventoryAssistantResult {
  /**
   * Returns true if the assistant button is visible
   */
  showAssistant: boolean;
  /**
   * Unique identifier for prompt context
   */
  promptContextId: string;
  /**
   * Function to show assistant overlay
   */
  showAssistantOverlay: (show: boolean) => void;
}

/**
 * Hook to return the assistant button visibility and prompt context id for Asset Inventory entities
 */
export const useAssetInventoryAssistant = ({
  entityId,
  entityFields,
  isPreviewMode,
}: UseAssetInventoryAssistantParams): UseAssetInventoryAssistantResult => {
  const { hasAssistantPrivilege, isAssistantEnabled, isAssistantVisible } =
    useAssistantAvailability();
  const { basePromptContexts } = useAssistantContext();
  const suggestedUserPrompt = useMemo(
    () =>
      basePromptContexts.find(({ category }) => category === PROMPT_CONTEXT_ASSET_CATEGORY)
        ?.suggestedUserPrompt,
    [basePromptContexts]
  );
  const useAssistantHook = hasAssistantPrivilege ? useAssistantOverlay : useAssistantNoop;

  const getPromptContext = useCallback(async () => entityFields || {}, [entityFields]);

  const uniqueName = useMemo(() => {
    const entityName = entityId || ENTITY_SUMMARY_CONVERSATION_ID;
    return `${entityName}`;
  }, [entityId]);

  const { promptContextId, showAssistantOverlay } = useAssistantHook(
    'entity',
    uniqueName,
    ENTITY_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW),
    getPromptContext,
    null,
    suggestedUserPrompt,
    ENTITY_SUMMARY_VIEW_CONTEXT_TOOLTIP,
    isAssistantEnabled
  );

  return {
    showAssistant:
      isAssistantEnabled &&
      hasAssistantPrivilege &&
      promptContextId !== null &&
      isAssistantVisible &&
      !isPreviewMode,
    showAssistantOverlay,
    promptContextId: promptContextId || '',
  };
};
