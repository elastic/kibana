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
import type { GenericEntityRecord } from '../../../../asset_inventory/types/generic_entity_record';
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
  /**
   * Entity data
   */
  entityData: GenericEntityRecord;
  /**
   * Entity ID
   */
  entityId: EntityEcs['id'];
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
  entityData,
  entityId,
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

  // TODO: does it make sense to convert like this? Asset Inventory also has field data, should we use it somehow?
  // Create prompt context directly from entity data
  const getPromptContext = useCallback(async () => {
    if (!entityData) return {};

    // Helper function to flatten the document and preserve field paths
    const flattenDocument = (obj: Record<string, unknown>, path = ''): Record<string, string[]> => {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;

        // Skip null or undefined values
        if (value === null || value === undefined) {
          return acc;
          // Handle nested objects (but not arrays)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          return { ...acc, ...flattenDocument(value as Record<string, unknown>, currentPath) };
          // Handle arrays and primitive values
        } else {
          const stringValues = Array.isArray(value)
            ? value.map((item) => String(item))
            : [String(value)];
          return { ...acc, [currentPath]: stringValues };
        }
      }, {});
    };

    // Directly convert entity data to the format expected by the AI Assistant
    return flattenDocument(entityData as Record<string, unknown>);
  }, [entityData]);

  const uniqueName = useMemo(() => {
    const entityName = entityData?.name || entityId || ENTITY_SUMMARY_CONVERSATION_ID;
    return `${entityName}`;
  }, [entityData, entityId]);

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
      isAssistantEnabled && hasAssistantPrivilege && promptContextId !== null && isAssistantVisible,
    showAssistantOverlay,
    promptContextId: promptContextId || '',
  };
};
