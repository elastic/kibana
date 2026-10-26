/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { LIMITS, ruleSchema, validateFlagConsistency } from '../../../../common';
import type { Rule, ValidationIssue, ValueType, VariationValue } from '../../../../common';

const rulesArraySchema = lazySchema(() => z.array(ruleSchema).max(LIMITS.maxRulesPerLevel));

export interface ParseRulesContext {
  variations: readonly VariationValue[];
  valueType: ValueType;
}

export type ParseRulesResult = { ok: true; rules: Rule[] } | { ok: false; error: string };

export const serializeRules = (rules: readonly Rule[]): string => JSON.stringify(rules, null, 2);

const invalidJsonMessage = () =>
  i18n.translate('xpack.featureFlagsManagement.ruleComposer.invalidJsonErrorMessage', {
    defaultMessage: 'The rules are not valid JSON.',
  });

const invalidSchemaMessage = () =>
  i18n.translate('xpack.featureFlagsManagement.ruleComposer.invalidSchemaErrorMessage', {
    defaultMessage: 'The rules do not match the rule schema.',
  });

const formatZodError = (error: {
  issues?: ReadonlyArray<{ path?: PropertyKey[]; message: string }>;
}): string => {
  const issues = error.issues ?? [];
  if (issues.length === 0) {
    return invalidSchemaMessage();
  }
  return issues
    .map((issue) => {
      const path = (issue.path ?? []).map((part) => String(part)).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('\n');
};

const formatConsistencyIssues = (issues: readonly ValidationIssue[]): string =>
  issues
    .map((issue) => {
      const path = issue.path.replace(/^environments\.rules\./, '');
      return path && path !== 'environments' ? `${path}: ${issue.message}` : issue.message;
    })
    .join('\n');

/**
 * Parses a rules JSON document. Invalid JSON or a failed schema/consistency check
 * returns an error and no rules, so the caller can keep the structured editor as it was.
 */
export const parseRulesJson = (text: string, context: ParseRulesContext): ParseRulesResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: invalidJsonMessage() };
  }

  const schemaResult = rulesArraySchema.safeParse(parsed);
  if (!schemaResult.success) {
    return { ok: false, error: formatZodError(schemaResult.error) };
  }

  if (context.variations.length < 1) {
    return { ok: false, error: invalidSchemaMessage() };
  }

  const issues = validateFlagConsistency({
    key: 'rules',
    value_type: context.valueType,
    variations: [...context.variations],
    apps: ['rules'],
    tags: [],
    environments: {
      rules: { default: context.variations[0], rules: schemaResult.data },
    },
  }).filter(
    (issue) => issue.path.startsWith('environments.rules.rules') || issue.path === 'environments'
  );

  if (issues.length > 0) {
    return { ok: false, error: formatConsistencyIssues(issues) };
  }

  return { ok: true, rules: schemaResult.data };
};

export const percentageWeightsTotal = (percentages: Readonly<Record<string, number>>): number =>
  Object.values(percentages).reduce((total, value) => total + value, 0);

/** True when every weight is an integer from 0 to 100 and the weights sum to 100. */
export const percentageWeightsAreValid = (
  percentages: Readonly<Record<string, number>>
): boolean => {
  const values = Object.values(percentages);
  if (values.length === 0) {
    return false;
  }
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 100)) {
    return false;
  }
  return percentageWeightsTotal(percentages) === 100;
};

export const rulesHaveValidPercentages = (rules: readonly Rule[]): boolean => {
  for (const rule of rules) {
    if (rule.type === 'percentage') {
      if (!percentageWeightsAreValid(rule.percentages)) {
        return false;
      }
    } else if (rule.rules && !rulesHaveValidPercentages(rule.rules)) {
      return false;
    }
  }
  return true;
};

/** Splits 100 across variations. The last variation receives any remainder. */
export const equalPercentages = (variations: readonly VariationValue[]): Record<string, number> => {
  if (variations.length === 0) {
    return {};
  }
  const base = Math.floor(100 / variations.length);
  const remainder = 100 - base * variations.length;
  const percentages: Record<string, number> = {};
  variations.forEach((variation, index) => {
    const extra = index === variations.length - 1 ? remainder : 0;
    percentages[String(variation)] = base + extra;
  });
  return percentages;
};

/**
 * Keeps match returns and percentage keys aligned when variations are edited by index.
 * A change in the number of variations redistributes percentage rules evenly.
 */
export const remapRuleVariations = (
  rules: readonly Rule[],
  previous: readonly VariationValue[],
  next: readonly VariationValue[]
): Rule[] => {
  if (next.length === 0) {
    return [];
  }
  const countChanged = previous.length !== next.length;
  const remapValue = (value: VariationValue): VariationValue => {
    const index = previous.findIndex((candidate) => Object.is(candidate, value));
    if (index === -1 || index >= next.length) {
      return next[0];
    }
    return next[index];
  };
  const remapPercentages = (percentages: Record<string, number>): Record<string, number> => {
    if (countChanged) {
      return equalPercentages(next);
    }
    const remapped: Record<string, number> = {};
    previous.forEach((variation, index) => {
      remapped[String(next[index])] = percentages[String(variation)] ?? 0;
    });
    return remapped;
  };
  const visit = (rule: Rule): Rule => {
    if (rule.type === 'percentage') {
      return { ...rule, percentages: remapPercentages(rule.percentages) };
    }
    const nextRule: Rule = {
      type: 'match',
      attribute: rule.attribute,
      operator: rule.operator,
      values: rule.values,
      ...(rule.return !== undefined ? { return: remapValue(rule.return) } : {}),
      ...(rule.rules ? { rules: rule.rules.map(visit) } : {}),
    };
    return nextRule;
  };
  return rules.map(visit);
};

export const emptyMatchRule = (variations: readonly VariationValue[]): Rule => ({
  type: 'match',
  attribute: '',
  operator: 'in',
  values: [],
  return: variations[0],
});

export const emptyPercentageRule = (variations: readonly VariationValue[]): Rule => ({
  type: 'percentage',
  per_attribute: '',
  percentages: equalPercentages(variations),
});
