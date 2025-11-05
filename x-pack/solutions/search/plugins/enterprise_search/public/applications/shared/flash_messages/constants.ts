/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlashMessageColors } from './types';

export const FLASH_MESSAGE_TYPES = {
  success: { color: 'success' as FlashMessageColors, iconType: 'check' },
  info: { color: 'primary' as FlashMessageColors, iconType: 'info' },
  warning: { color: 'warning' as FlashMessageColors, iconType: 'warning' },
  error: { color: 'danger' as FlashMessageColors, iconType: 'error' },
};

// This is the default amount of time (5 seconds) a toast will last before disappearing
// It can be overridden per-toast by passing the `toastLifetimeMs` property - @see types.ts
export const DEFAULT_TOAST_TIMEOUT = 5000;
