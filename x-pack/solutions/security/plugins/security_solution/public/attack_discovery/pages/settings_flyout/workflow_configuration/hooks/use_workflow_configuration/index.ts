/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';
import { DEFAULT_WORKFLOW_CONFIGURATION } from '../../constants';
import { getWorkflowSettings, setWorkflowSettings } from '../../local_storage';
import type { WorkflowConfiguration } from '../../types';

interface UseWorkflowConfigurationResult {
  clearSettings: () => void;
  isLoading: boolean;
  updateSettings: (settings: WorkflowConfiguration) => boolean;
  workflowConfiguration: WorkflowConfiguration;
}

/**
 * React hook to manage workflow configuration settings in local storage
 *
 * This hook:
 * - Reads workflow configuration from local storage (space-scoped)
 * - Provides a method to update settings
 * - Automatically syncs across browser tabs using storage events
 * - Returns loading state while space ID is being resolved
 *
 * @returns {UseWorkflowConfigurationResult} Workflow configuration and update methods
 */
export const useWorkflowConfiguration = (): UseWorkflowConfigurationResult => {
  const spaceId = useSpaceId();
  const [workflowConfiguration, setWorkflowConfigurationState] = useState<WorkflowConfiguration>(
    DEFAULT_WORKFLOW_CONFIGURATION
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from local storage when space ID becomes available
  useEffect(() => {
    if (spaceId) {
      const settings = getWorkflowSettings(spaceId);
      setWorkflowConfigurationState(settings);
      setIsLoading(false);
    }
  }, [spaceId]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    if (!spaceId) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      // Only respond to changes for our specific key
      if (event.key && event.key.includes('workflowConfig') && event.key.includes(spaceId)) {
        if (event.newValue) {
          try {
            const newSettings = JSON.parse(event.newValue);
            setWorkflowConfigurationState(newSettings);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error parsing workflow configuration from storage event:', error);
          }
        } else {
          // Settings were cleared
          setWorkflowConfigurationState(DEFAULT_WORKFLOW_CONFIGURATION);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [spaceId]);

  // Update settings in local storage and state
  const updateSettings = useCallback(
    (settings: WorkflowConfiguration): boolean => {
      if (!spaceId) {
        // eslint-disable-next-line no-console
        console.warn('Cannot update workflow settings: space ID not available');
        return false;
      }

      const success = setWorkflowSettings(spaceId, settings);

      if (success) {
        setWorkflowConfigurationState(settings);
      }

      return success;
    },
    [spaceId]
  );

  // Clear settings and reset to defaults
  const clearSettings = useCallback(() => {
    if (!spaceId) {
      // eslint-disable-next-line no-console
      console.warn('Cannot clear workflow settings: space ID not available');
      return;
    }

    setWorkflowSettings(spaceId, DEFAULT_WORKFLOW_CONFIGURATION);
    setWorkflowConfigurationState(DEFAULT_WORKFLOW_CONFIGURATION);
  }, [spaceId]);

  return {
    clearSettings,
    isLoading,
    updateSettings,
    workflowConfiguration,
  };
};
