/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

/** Prototype variants of the workflow details flyout. */
export type FlyoutVariant = 'inline' | 'expanding';

export const FLYOUT_VARIANT_OPTIONS: Array<{ value: FlyoutVariant; text: string }> = [
  { value: 'inline', text: 'Graph/YAML in flyout' },
  { value: 'expanding', text: 'Graph/Yaml expanding' },
];

// Tiny external store: the selector lives in the Kibana top bar (outside the page's React tree)
// while the table that opens the flyout lives in the page.
let currentVariant: FlyoutVariant = 'inline';
const listeners = new Set<() => void>();

export const setFlyoutVariant = (variant: FlyoutVariant) => {
  currentVariant = variant;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Whether the top-bar selector should render (only while the Workflows page is mounted).
let selectorVisible = false;

export const setPrototypeSelectorVisible = (visible: boolean) => {
  selectorVisible = visible;
  listeners.forEach((listener) => listener());
};

export const usePrototypeSelectorVisible = (): boolean =>
  useSyncExternalStore(subscribe, () => selectorVisible);

export const useFlyoutVariant = (): FlyoutVariant =>
  useSyncExternalStore(subscribe, () => currentVariant);
