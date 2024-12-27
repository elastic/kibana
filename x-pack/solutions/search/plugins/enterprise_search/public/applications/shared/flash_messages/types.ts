/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

export type FlashMessageTypes = 'success' | 'info' | 'warning' | 'error';
export type FlashMessageColors = 'success' | 'primary' | 'warning' | 'danger';

export interface IFlashMessage {
  description?: ReactNode;
  iconType?: string;
  message: ReactNode;
  type: FlashMessageTypes;
}

// @see EuiGlobalToastListToast for more props
export interface ToastOptions {
  'aria-live'?: 'assertive' | 'polite'; // Defaults to 'polite'
  iconType?: string;
  role?: string; // Defaults to the log role. The alert role can be considered only if all toasts in this list will require immediate user attention.
  text?: string; // Additional text below the message/title, same as EuiToast['text']
  toastLifeTimeMs?: number; // Allows customizing per-toast timeout
}
