/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIMITS } from './constants';
import type {
  EnvironmentRuleSet,
  FlagDefinition,
  Prerequisite,
  Rule,
  ValueType,
  VariationValue,
} from './schemas/flags';
import { SEMVER_OPERATORS } from './schemas/flags';

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Full `major.minor.patch` versions, with optional pre-release and build metadata. */
export const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/;

/** The parts of a flag that its consistency depends on. */
export type FlagConsistencyInput = Pick<
  FlagDefinition,
  'key' | 'value_type' | 'variations' | 'apps' | 'tags' | 'environments'
>;

export const isVariation = (variations: readonly VariationValue[], value: VariationValue) =>
  variations.some((variation) => variation === value);

const describeValue = (value: VariationValue) => JSON.stringify(value);

/**
 * Checks that a flag is consistent with itself: variations, defaults, rule returns,
 * percentages, semver boundaries and nesting depth. It does not look at other flags,
 * apps or environments; the server checks those references.
 */
export const validateFlagConsistency = (flag: FlagConsistencyInput): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const { variations } = flag;

  validateVariations(variations, flag.value_type, issues);
  validateUnique(flag.apps, 'apps', issues);
  validateUnique(flag.tags, 'tags', issues);

  let totalRules = 0;
  const countRule = () => {
    totalRules++;
  };

  for (const [environment, ruleSet] of Object.entries(flag.environments)) {
    validateRuleSet(
      flag.key,
      variations,
      ruleSet,
      `environments.${environment}`,
      issues,
      countRule
    );
  }

  if (totalRules > LIMITS.maxRulesTotal) {
    issues.push({
      path: 'environments',
      message: `A flag can have at most ${LIMITS.maxRulesTotal} rules across all environments, but it has ${totalRules}.`,
    });
  }

  return issues;
};

const validateVariations = (
  variations: readonly VariationValue[],
  valueType: ValueType,
  issues: ValidationIssue[]
) => {
  const seen = new Map<string, number>();
  variations.forEach((variation, index) => {
    if (typeof variation !== valueType) {
      issues.push({
        path: `variations.${index}`,
        message: `Variation ${describeValue(
          variation
        )} is a ${typeof variation}, but the flag's value_type is ${valueType}.`,
      });
    }
    // Percentages are keyed by String(variation), so the string form must be unique too.
    const asString = String(variation);
    const earlier = seen.get(asString);
    if (earlier !== undefined) {
      issues.push({
        path: `variations.${index}`,
        message: `Variation ${describeValue(variation)} duplicates variations.${earlier}.`,
      });
    } else {
      seen.set(asString, index);
    }
  });
};

const validateUnique = (values: readonly string[], path: string, issues: ValidationIssue[]) => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push({ path: `${path}.${index}`, message: `"${value}" is listed more than once.` });
    }
    seen.add(value);
  });
};

const validateRuleSet = (
  flagKey: string,
  variations: readonly VariationValue[],
  ruleSet: EnvironmentRuleSet,
  path: string,
  issues: ValidationIssue[],
  countRule: () => void
) => {
  if (!isVariation(variations, ruleSet.default)) {
    issues.push({
      path: `${path}.default`,
      message: `Default ${describeValue(ruleSet.default)} is not one of the flag's variations.`,
    });
  }

  validatePrerequisites(flagKey, ruleSet.prerequisites ?? [], `${path}.prerequisites`, issues);
  validateRules(variations, ruleSet.rules ?? [], `${path}.rules`, 1, issues, countRule);
};

const validatePrerequisites = (
  flagKey: string,
  prerequisites: readonly Prerequisite[],
  path: string,
  issues: ValidationIssue[]
) => {
  const seen = new Set<string>();
  prerequisites.forEach((prerequisite, index) => {
    if (prerequisite.flag === flagKey) {
      issues.push({
        path: `${path}.${index}.flag`,
        message: 'A flag cannot be its own prerequisite.',
      });
    }
    if (seen.has(prerequisite.flag)) {
      issues.push({
        path: `${path}.${index}.flag`,
        message: `Prerequisite "${prerequisite.flag}" is listed more than once.`,
      });
    }
    seen.add(prerequisite.flag);
  });
};

const validateRules = (
  variations: readonly VariationValue[],
  rules: readonly Rule[],
  path: string,
  depth: number,
  issues: ValidationIssue[],
  countRule: () => void
) => {
  if (rules.length > 0 && depth > LIMITS.maxRuleDepth) {
    issues.push({
      path,
      message: `Rules can be nested at most ${LIMITS.maxRuleDepth} levels deep.`,
    });
    return;
  }

  rules.forEach((rule, index) => {
    countRule();
    const rulePath = `${path}.${index}`;

    if (rule.type === 'percentage') {
      validatePercentages(variations, rule.percentages, `${rulePath}.percentages`, issues);
      return;
    }

    const hasReturn = rule.return !== undefined;
    const hasRules = rule.rules !== undefined && rule.rules.length > 0;
    if (hasReturn === hasRules) {
      issues.push({
        path: rulePath,
        message: 'A match rule must have either "return" or non-empty "rules", but not both.',
      });
    }
    if (rule.return !== undefined && !isVariation(variations, rule.return)) {
      issues.push({
        path: `${rulePath}.return`,
        message: `Return value ${describeValue(rule.return)} is not one of the flag's variations.`,
      });
    }
    if (SEMVER_OPERATORS.includes(rule.operator)) {
      const [boundary] = rule.values;
      if (
        rule.values.length !== 1 ||
        typeof boundary !== 'string' ||
        !SEMVER_PATTERN.test(boundary)
      ) {
        issues.push({
          path: `${rulePath}.values`,
          message: `Operator ${rule.operator} needs exactly one full semver string, for example "9.3.2".`,
        });
      }
    }
    if (rule.rules) {
      validateRules(variations, rule.rules, `${rulePath}.rules`, depth + 1, issues, countRule);
    }
  });
};

const validatePercentages = (
  variations: readonly VariationValue[],
  percentages: Record<string, number>,
  path: string,
  issues: ValidationIssue[]
) => {
  const variationKeys = new Set(variations.map(String));
  let total = 0;
  for (const [key, percentage] of Object.entries(percentages)) {
    total += percentage;
    if (!variationKeys.has(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: `"${key}" is not one of the flag's variations. Valid keys: ${[...variationKeys]
          .map((variationKey) => `"${variationKey}"`)
          .join(', ')}.`,
      });
    }
  }
  if (total !== 100) {
    issues.push({ path, message: `Percentages must add up to 100, but they add up to ${total}.` });
  }
};

/**
 * Prerequisite edges for one environment: flag key to the keys of its prerequisites.
 */
export type PrerequisiteGraph = ReadonlyMap<string, readonly string[]>;

/**
 * Returns the first prerequisite cycle reachable from `start`, as the list of flag keys
 * that form it (the first key is repeated at the end), or `undefined` when there is none.
 */
export const findPrerequisiteCycle = (
  graph: PrerequisiteGraph,
  start: string
): string[] | undefined => {
  const onPath = new Set<string>();
  const done = new Set<string>();
  const path: string[] = [];

  const visit = (key: string): string[] | undefined => {
    if (onPath.has(key)) {
      return [...path.slice(path.indexOf(key)), key];
    }
    if (done.has(key)) {
      return undefined;
    }
    onPath.add(key);
    path.push(key);
    for (const next of graph.get(key) ?? []) {
      const cycle = visit(next);
      if (cycle) {
        return cycle;
      }
    }
    path.pop();
    onPath.delete(key);
    done.add(key);
    return undefined;
  };

  return visit(start);
};
