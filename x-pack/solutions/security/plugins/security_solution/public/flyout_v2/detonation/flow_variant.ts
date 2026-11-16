/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

/**
 * Prototype variants of the detonate flow started from an alert:
 * - `modal`: pick a file, fill in the "Submit for detonation" modal, then see the report flyout.
 * - `toast`: pick a file, wait a moment, then get a "Detonation submitted" toast.
 */
export type FlowVariant = 'modal' | 'toast';

export const FLOW_VARIANT_OPTIONS: Array<{ value: FlowVariant; text: string }> = [
  { value: 'modal', text: 'Flow modal' },
  { value: 'toast', text: 'Flow toast' },
];

// Tiny external store: the selector lives in the Kibana top bar, outside the app's React tree.
let currentVariant: FlowVariant = 'modal';
const listeners = new Set<() => void>();

export const setFlowVariant = (variant: FlowVariant) => {
  currentVariant = variant;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useFlowVariant = (): FlowVariant =>
  useSyncExternalStore(subscribe, () => currentVariant);
