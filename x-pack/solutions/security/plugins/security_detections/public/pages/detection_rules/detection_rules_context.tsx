/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * React context that makes the API service and core notifications available to
 * all components in the detection rules management page.
 *
 * The context is populated once by the mount function and never changes. Using
 * context avoids prop-drilling the service through every component.
 */

import { createContext, useContext } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { DetectionRulesApi } from '../../services/detection_rules_api';

export interface DetectionRulesContextValue {
  api: DetectionRulesApi;
  notifications: NotificationsStart;
}

export const DetectionRulesContext = createContext<DetectionRulesContextValue | null>(null);

/**
 * Returns the context value; throws if called outside a
 * `DetectionRulesContext.Provider`.
 */
export const useDetectionRulesContext = (): DetectionRulesContextValue => {
  const ctx = useContext(DetectionRulesContext);
  if (!ctx) {
    throw new Error(
      'useDetectionRulesContext must be called inside DetectionRulesContext.Provider'
    );
  }
  return ctx;
};
