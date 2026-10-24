/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DEFAULT_FUNNEL_STEPS,
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_LABEL_MAX_LENGTH,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
  type FunnelStepDef,
  type FunnelStepType,
  type SessionFunnelResponse,
} from './session_funnel';

export const RUM_CONVERSION_GOAL_SO_TYPE = 'ux-rum-conversion-goal';

export const CONVERSION_GOAL_NAME_MAX = 80;
export const CONVERSION_GOAL_VALUE_MAX = 10_000_000;
export const CONVERSION_GOAL_CURRENCY_MAX = 3;
export const DEFAULT_CONVERSION_VALUE = 49;
export const DEFAULT_CONVERSION_CURRENCY = 'USD';

export const CONVERSION_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;
export type ConversionCurrency = (typeof CONVERSION_CURRENCIES)[number];

export interface ConversionGoalDraft {
  name: string;
  steps: FunnelStepDef[];
  value: number;
  currency: string;
}

export interface ConversionGoalAttributes extends ConversionGoalDraft {
  createdAt: string;
  updatedAt: string;
}

export interface ConversionGoal extends ConversionGoalAttributes {
  id: string;
}

export interface ConversionGoalImpact {
  entered: number;
  converted: number;
  conversionRate: number;
  attributed: number;
  missed: number;
}

export interface ConversionGoalPreset {
  id: string;
  name: string;
  steps: FunnelStepDef[];
  value: number;
  currency: string;
}

export const untitledConversionGoalName = (): string =>
  i18n.translate('xpack.ux.goals.untitledName', {
    defaultMessage: 'Untitled goal',
  });

export const createEmptyGoalDraft = (): ConversionGoalDraft => ({
  name: i18n.translate('xpack.ux.goals.checkoutPresetName', {
    defaultMessage: 'Checkout',
  }),
  steps: DEFAULT_FUNNEL_STEPS.map((step) => ({ ...step })),
  value: DEFAULT_CONVERSION_VALUE,
  currency: DEFAULT_CONVERSION_CURRENCY,
});

export const CONVERSION_GOAL_PRESETS: ConversionGoalPreset[] = [
  {
    id: 'checkout',
    name: i18n.translate('xpack.ux.goals.checkoutPresetName', {
      defaultMessage: 'Checkout',
    }),
    steps: DEFAULT_FUNNEL_STEPS.map((step) => ({ ...step })),
    value: DEFAULT_CONVERSION_VALUE,
    currency: DEFAULT_CONVERSION_CURRENCY,
  },
  {
    id: 'signup',
    name: i18n.translate('xpack.ux.goals.signupPresetName', {
      defaultMessage: 'Sign up',
    }),
    steps: [
      { type: 'page', value: 'signup', label: 'Sign up' },
      { type: 'activity', value: 'Create account', label: 'Create account' },
      { type: 'page', value: 'welcome', label: 'Welcome' },
    ],
    value: 0,
    currency: DEFAULT_CONVERSION_CURRENCY,
  },
  {
    id: 'search',
    name: i18n.translate('xpack.ux.goals.searchPresetName', {
      defaultMessage: 'Search to cart',
    }),
    steps: [
      { type: 'page', value: 'search', label: 'Search' },
      { type: 'page', value: 'product', label: 'Product' },
      { type: 'activity', value: 'Add to cart', label: 'Add to cart' },
    ],
    value: DEFAULT_CONVERSION_VALUE,
    currency: DEFAULT_CONVERSION_CURRENCY,
  },
];

export const sanitizeConversionCurrency = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return DEFAULT_CONVERSION_CURRENCY;
  }
  const code = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, CONVERSION_GOAL_CURRENCY_MAX);
  return code.length === CONVERSION_GOAL_CURRENCY_MAX ? code : DEFAULT_CONVERSION_CURRENCY;
};

export const sanitizeConversionValue = (raw: unknown): number => {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.min(CONVERSION_GOAL_VALUE_MAX, Math.round(parsed * 100) / 100);
};

export const sanitizeConversionName = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return untitledConversionGoalName();
  }
  const trimmed = raw.trim().slice(0, CONVERSION_GOAL_NAME_MAX);
  return trimmed.length > 0 ? trimmed : untitledConversionGoalName();
};

export const sanitizeFunnelSteps = (raw: unknown): FunnelStepDef[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const steps: FunnelStepDef[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') {
      continue;
    }
    const record = item as { type?: unknown; value?: unknown; label?: unknown };
    const type: FunnelStepType = record.type === 'activity' ? 'activity' : 'page';
    const value =
      typeof record.value === 'string'
        ? record.value.trim().slice(0, FUNNEL_STEP_VALUE_MAX_LENGTH)
        : '';
    if (!value) {
      continue;
    }
    const label =
      typeof record.label === 'string'
        ? record.label.trim().slice(0, FUNNEL_STEP_LABEL_MAX_LENGTH)
        : '';
    steps.push({
      type,
      value,
      ...(label ? { label } : {}),
    });
    if (steps.length >= FUNNEL_MAX_STEPS) {
      break;
    }
  }
  return steps;
};

export const sanitizeConversionGoal = (input: {
  name?: unknown;
  steps?: unknown;
  value?: unknown;
  currency?: unknown;
}): ConversionGoalDraft => ({
  name: sanitizeConversionName(input.name),
  steps: sanitizeFunnelSteps(input.steps),
  value: sanitizeConversionValue(input.value),
  currency: sanitizeConversionCurrency(input.currency),
});

export const usableGoalSteps = (steps: FunnelStepDef[]): FunnelStepDef[] =>
  steps.filter((step) => step.value.trim().length > 0);

export const isRunnableGoal = (steps: FunnelStepDef[]): boolean =>
  usableGoalSteps(steps).length >= FUNNEL_MIN_STEPS;

export const funnelStepsEqual = (left: FunnelStepDef[], right: FunnelStepDef[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((step, index) => {
    const other = right[index];
    return (
      step.type === other.type &&
      step.value === other.value &&
      (step.label ?? '') === (other.label ?? '')
    );
  });
};

export const conversionGoalDraftsEqual = (
  left: ConversionGoalDraft,
  right: ConversionGoalDraft
): boolean =>
  left.name === right.name &&
  left.value === right.value &&
  left.currency === right.currency &&
  funnelStepsEqual(left.steps, right.steps);

export const computeGoalImpact = (
  funnel: SessionFunnelResponse,
  value: number
): ConversionGoalImpact => {
  const entered = funnel.steps[0]?.count ?? 0;
  const converted = funnel.steps.length > 0 ? funnel.steps[funnel.steps.length - 1].count : 0;
  const conversionRate = entered > 0 ? converted / entered : 0;
  const safeValue = sanitizeConversionValue(value);
  return {
    entered,
    converted,
    conversionRate,
    attributed: converted * safeValue,
    missed: Math.max(0, entered - converted) * safeValue,
  };
};

export const formatGoalMoney = (amount: number, currency: string): string => {
  const code = sanitizeConversionCurrency(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
};
