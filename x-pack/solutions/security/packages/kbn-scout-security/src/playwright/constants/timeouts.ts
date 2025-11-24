/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Standardized timeout constants for Scout Security tests.
 * These values are calibrated for stability across different test environments.
 */
export const TIMEOUTS = {
  /**
   * Short timeout for UI elements that should appear quickly (modals, buttons, etc.)
   * Use when element is expected to be immediately available.
   */
  UI_ELEMENT_SHORT: 2000,

  /**
   * Standard timeout for most UI interactions
   * Use for most visibility checks and UI state changes.
   */
  UI_ELEMENT_STANDARD: 5000,

  /**
   * Long timeout for elements that require async operations (API calls, data loading)
   * Use for dropdown population, async data fetching, conversation loading.
   */
  UI_ELEMENT_LONG: 10000,

  /**
   * Extra long timeout for heavy operations (conversation list, large data sets)
   * Use for operations that may require significant backend processing.
   */
  UI_ELEMENT_EXTRA_LONG: 15000,

  /**
   * Timeout for network requests to settle after an action
   * Use with waitForLoadState('networkidle') for ensuring all requests complete.
   */
  NETWORK_IDLE: 5000,

  /**
   * Timeout for AI Assistant responses (LLM processing, message generation)
   * Use for operations involving AI/LLM calls which can be slow in serverless.
   */
  AI_ASSISTANT_RESPONSE: 30000,
} as const;

/**
 * Type guard to ensure timeout values are used consistently
 */
export type TimeoutValue = (typeof TIMEOUTS)[keyof typeof TIMEOUTS];
