/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { NodeViewModel } from '../components/types';
import type { CalloutConfig } from '../components/callout/callout.translations';
import { useCalloutStatus } from './use_callout_status';
import { useCalloutLinks } from './use_callout_links';
import { getCalloutConfig } from '../components/callout/callout.config';

/**
 * Result type for useGraphCallout hook.
 * Uses discriminated union to ensure type safety - when shouldShowCallout is true,
 * config is guaranteed to be defined along with onDismiss callback; when false,
 * both config and onDismiss are undefined.
 */
export type UseGraphCalloutResult =
  | {
      /** Flag indicating the callout should be displayed */
      shouldShowCallout: true;
      /** Complete callout configuration including title, message, and action links */
      config: CalloutConfig;
      /** Callback to dismiss the callout */
      onDismiss: () => void;
    }
  | {
      /** Flag indicating the callout should not be displayed */
      shouldShowCallout: false;
      /** Config is undefined when callout should not be shown */
      config: undefined;
      /** onDismiss is undefined when callout should not be shown */
      onDismiss: undefined;
    };

/**
 * Orchestrator hook that combines callout status, links, and configuration.
 * Provides a single entry point for graph callout functionality with dismiss tracking.
 * When a user dismisses the callout, it won't be shown again until the component unmounts.
 *
 * @param nodes - Array of graph nodes to analyze
 * @returns Object with shouldShowCallout flag, config, and onDismiss callback (if applicable)
 */
export const useGraphCallout = (nodes: NodeViewModel[]): UseGraphCalloutResult => {
  const { shouldShowCallout, status } = useCalloutStatus(nodes);
  const links = useCalloutLinks();

  // Track if the callout has been dismissed
  const [isDismissed, setIsDismissed] = useState(false);

  // Callback to dismiss the callout
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  if (!shouldShowCallout || !links || isDismissed) {
    return {
      shouldShowCallout: false,
      config: undefined,
      onDismiss: undefined,
    };
  }

  const config = getCalloutConfig(status, links);

  return {
    shouldShowCallout: true,
    config,
    onDismiss: handleDismiss,
  };
};
