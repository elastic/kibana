/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Simulated metric-tile states for prototype v.9.1, driven from the Prototype
 * settings menu (Empty states / Loading states / Error states).
 *
 * Each menu holds one state at a time plus a Today / Proposed switch: Today
 * reproduces the product as described in security-team#20452, Proposed shows
 * the suggested design (on by default). Only one state is on at a time across
 * the three menus.
 */

import { useCallback, useEffect, useState } from 'react';

export type EmptyStateId =
  | 'none'
  | 'zeroCount'
  | 'zeroDelta'
  | 'notEnoughHistory'
  | 'noMlJobs'
  | 'noRiskData'
  | 'noAlertsIndex'
  | 'fewSparklinePoints';

export type LoadingStateId = 'none' | 'countLoading' | 'deltaLoading' | 'sparklineLoading';

export type ErrorStateId =
  | 'none'
  | 'countFails'
  | 'countTimeout'
  | 'deltaFails'
  | 'historyCheckFails'
  | 'sparklineFails'
  | 'noPrivileges'
  | 'over1000';

export type PrototypeStateGroup = 'empty' | 'loading' | 'error';

export type StateVariant = 'today' | 'proposed';

export interface PrototypeStates {
  empty: EmptyStateId;
  loading: LoadingStateId;
  error: ErrorStateId;
  variants: Record<PrototypeStateGroup, StateVariant>;
}

export interface StateOption<T extends string> {
  key: T;
  label: string;
}

export const EMPTY_STATE_OPTIONS: Array<StateOption<EmptyStateId>> = [
  { key: 'none', label: 'None' },
  { key: 'zeroCount', label: 'Count is 0' },
  { key: 'zeroDelta', label: 'No change vs. previous period' },
  { key: 'notEnoughHistory', label: 'Not enough history to compare' },
  { key: 'noMlJobs', label: 'No anomaly detection jobs' },
  { key: 'noRiskData', label: 'No risk score data' },
  { key: 'noAlertsIndex', label: 'Space has no alerts index' },
  { key: 'fewSparklinePoints', label: 'Sparkline has under 2 points' },
];

export const LOADING_STATE_OPTIONS: Array<StateOption<LoadingStateId>> = [
  { key: 'none', label: 'None' },
  { key: 'countLoading', label: 'Count loading' },
  { key: 'deltaLoading', label: 'Change badge loading' },
  { key: 'sparklineLoading', label: 'Sparkline loading' },
];

export const ERROR_STATE_OPTIONS: Array<StateOption<ErrorStateId>> = [
  { key: 'none', label: 'None' },
  { key: 'countFails', label: 'Count query fails' },
  { key: 'countTimeout', label: 'Count query times out' },
  { key: 'deltaFails', label: 'Change badge query fails' },
  { key: 'historyCheckFails', label: 'History check fails' },
  { key: 'sparklineFails', label: 'Sparkline query fails' },
  { key: 'noPrivileges', label: 'No read privileges' },
  { key: 'over1000', label: 'Selected tile has over 1,000 entities' },
];

const DEFAULT_STATES: PrototypeStates = {
  empty: 'none',
  loading: 'none',
  error: 'none',
  variants: { empty: 'proposed', loading: 'proposed', error: 'proposed' },
};

let states: PrototypeStates = DEFAULT_STATES;

type Listener = (next: PrototypeStates) => void;
const listeners = new Set<Listener>();

export const getPrototypeStates = (): PrototypeStates => states;

const STATE_GROUPS: PrototypeStateGroup[] = ['empty', 'loading', 'error'];

/** Only one state is active at a time: picking one resets the other groups to `none`. */
export const updatePrototypeStates = (patch: Partial<PrototypeStates>): void => {
  const picked = STATE_GROUPS.find((group) => patch[group] && patch[group] !== 'none');
  const resets = picked
    ? Object.fromEntries(STATE_GROUPS.filter((group) => group !== picked).map((g) => [g, 'none']))
    : {};
  states = {
    ...states,
    ...resets,
    ...patch,
    variants: { ...states.variants, ...(patch.variants ?? {}) },
  };
  listeners.forEach((listener) => listener(states));
};

export const setPrototypeStateVariant = (group: PrototypeStateGroup, variant: StateVariant): void =>
  updatePrototypeStates({ variants: { ...states.variants, [group]: variant } });

export const usePrototypeStates = (): [
  PrototypeStates,
  (patch: Partial<PrototypeStates>) => void
] => {
  const [current, setCurrent] = useState(getPrototypeStates);

  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  const update = useCallback((patch: Partial<PrototypeStates>) => {
    updatePrototypeStates(patch);
  }, []);

  return [current, update];
};
