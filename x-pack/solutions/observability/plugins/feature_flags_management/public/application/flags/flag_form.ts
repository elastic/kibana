/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createFlagRequestSchema,
  findPrerequisiteCycle,
  FLAG_KEY_PATTERN,
  updateFlagRequestSchema,
  validateFlagConsistency,
  type CreateFlagRequest,
  type EnvironmentRuleSet,
  type Flag,
  type Prerequisite,
  type Rule,
  type UpdateFlagRequest,
  type ValidationIssue,
  type ValueType,
  type VariationValue,
} from '../../../common';
import { remapRuleVariations } from './rule_composer/rules_model';

export interface PrerequisiteDraft {
  flag: string;
  value?: VariationValue;
}

export interface EnvironmentDraft {
  defaultVariation: VariationValue;
  prerequisites: PrerequisiteDraft[];
  rules: Rule[];
}

export interface FlagFormState {
  key: string;
  name: string;
  description: string;
  valueType: ValueType;
  variations: VariationValue[];
  apps: string[];
  /** Display only. The server records this when the flag is created. */
  createdBy?: { username: string; fullName?: string };
  tags: string[];
  environmentKeys: string[];
  environments: Record<string, EnvironmentDraft>;
  version?: string;
}

export const defaultVariations = (valueType: ValueType): VariationValue[] => {
  switch (valueType) {
    case 'boolean':
      return [true, false];
    case 'number':
      return [0, 1];
    case 'string':
      return ['on', 'off'];
  }
};

export const emptyFlagForm = (): FlagFormState => ({
  key: '',
  name: '',
  description: '',
  valueType: 'boolean',
  variations: defaultVariations('boolean'),
  apps: [],
  tags: [],
  environmentKeys: [],
  environments: {},
});

export const flagToForm = (flag: Flag): FlagFormState => ({
  key: flag.key,
  name: flag.name ?? '',
  description: flag.description ?? '',
  valueType: flag.value_type,
  variations: flag.variations,
  apps: flag.apps,
  createdBy: flag.created_by
    ? { username: flag.created_by.username, fullName: flag.created_by.full_name }
    : undefined,
  tags: flag.tags,
  environmentKeys: Object.keys(flag.environments),
  environments: Object.fromEntries(
    Object.entries(flag.environments).map(([environment, ruleSet]) => [
      environment,
      {
        defaultVariation: ruleSet.default,
        prerequisites: (ruleSet.prerequisites ?? []).map((prerequisite) => ({
          flag: prerequisite.flag,
          value: prerequisite.value,
        })),
        rules: ruleSet.rules ?? [],
      },
    ])
  ),
  version: flag.version,
});

const emptyEnvironment = (variations: readonly VariationValue[]): EnvironmentDraft => ({
  defaultVariation: variations[0],
  prerequisites: [],
  rules: [],
});

export const withValueType = (form: FlagFormState, valueType: ValueType): FlagFormState => {
  const variations = defaultVariations(valueType);
  const environments: FlagFormState['environments'] = {};
  for (const [environment, ruleSet] of Object.entries(form.environments)) {
    environments[environment] = {
      defaultVariation: variations[0],
      prerequisites: ruleSet.prerequisites,
      rules: [],
    };
  }
  return { ...form, valueType, variations, environments };
};

export const withVariations = (
  form: FlagFormState,
  variations: VariationValue[]
): FlagFormState => {
  if (variations.length === 0) {
    return form;
  }
  const environments: FlagFormState['environments'] = {};
  for (const [environment, ruleSet] of Object.entries(form.environments)) {
    const defaultIndex = form.variations.findIndex((value) =>
      Object.is(value, ruleSet.defaultVariation)
    );
    environments[environment] = {
      ...ruleSet,
      defaultVariation:
        defaultIndex >= 0 && defaultIndex < variations.length
          ? variations[defaultIndex]
          : variations[0],
      rules: remapRuleVariations(ruleSet.rules, form.variations, variations),
    };
  }
  return { ...form, variations, environments };
};

export const withEnvironmentKeys = (form: FlagFormState, keys: string[]): FlagFormState => {
  const environments = { ...form.environments };
  for (const key of keys) {
    if (!environments[key]) {
      environments[key] = emptyEnvironment(form.variations);
    }
  }
  return { ...form, environmentKeys: keys, environments };
};

const completePrerequisites = (items: readonly PrerequisiteDraft[]): Prerequisite[] =>
  items.flatMap((item) => {
    const flag = item.flag.trim();
    if (!flag || item.value === undefined) {
      return [];
    }
    return [{ flag, value: item.value }];
  });

const buildEnvironments = (form: FlagFormState): Record<string, EnvironmentRuleSet> => {
  const environments: Record<string, EnvironmentRuleSet> = {};
  for (const key of form.environmentKeys) {
    const ruleSet = form.environments[key] ?? emptyEnvironment(form.variations);
    const prerequisites = completePrerequisites(ruleSet.prerequisites);
    environments[key] = {
      default: ruleSet.defaultVariation,
      ...(prerequisites.length > 0 ? { prerequisites } : {}),
      ...(ruleSet.rules.length > 0 ? { rules: ruleSet.rules } : {}),
    };
  }
  return environments;
};

const optionalText = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const toCreateFlagRequest = (form: FlagFormState): CreateFlagRequest => ({
  key: form.key.trim(),
  name: optionalText(form.name),
  description: optionalText(form.description),
  value_type: form.valueType,
  variations: form.variations,
  apps: form.apps,
  tags: form.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
  environments: buildEnvironments(form),
});

export const toUpdateFlagRequest = (form: FlagFormState): UpdateFlagRequest => {
  const { key: _key, ...definition } = toCreateFlagRequest(form);
  return { ...definition, version: form.version };
};

const zodIssues = (error: {
  issues?: ReadonlyArray<{ path?: PropertyKey[]; message: string }>;
}): ValidationIssue[] =>
  (error.issues ?? []).map((issue) => ({
    path: (issue.path ?? []).map((part) => String(part)).join('.'),
    message: issue.message,
  }));

const localIssues = (form: FlagFormState): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (form.valueType === 'string') {
    form.variations.forEach((variation, index) => {
      if (typeof variation === 'string' && variation.trim() === '') {
        issues.push({
          path: `variations.${index}`,
          message: i18n.translate(
            'xpack.featureFlagsManagement.flags.editor.emptyVariationErrorMessage',
            { defaultMessage: 'Enter a variation value.' }
          ),
        });
      }
    });
  }
  if (!FLAG_KEY_PATTERN.test(form.key.trim())) {
    issues.push({
      path: 'key',
      message: i18n.translate('xpack.featureFlagsManagement.flags.editor.flagKeyErrorMessage', {
        defaultMessage:
          'Flag keys start with a letter or digit and may contain letters, digits, dots, underscores and hyphens.',
      }),
    });
  }
  for (const environment of form.environmentKeys) {
    const drafts = form.environments[environment]?.prerequisites ?? [];
    drafts.forEach((prerequisite, index) => {
      if (!prerequisite.flag.trim() || prerequisite.value === undefined) {
        issues.push({
          path: `environments.${environment}.prerequisites.${index}`,
          message: i18n.translate(
            'xpack.featureFlagsManagement.flags.editor.incompletePrerequisiteErrorMessage',
            { defaultMessage: 'Choose a prerequisite flag and the variation it must serve.' }
          ),
        });
      }
    });
  }
  return issues;
};

/** Schema and consistency checks for the editor. Prerequisite cycles are checked separately. */
export const validateFlagWrite = (
  form: FlagFormState,
  mode: 'create' | 'update'
): ValidationIssue[] => {
  const issues = localIssues(form);
  const parsed =
    mode === 'create'
      ? createFlagRequestSchema.safeParse(toCreateFlagRequest(form))
      : updateFlagRequestSchema.safeParse(toUpdateFlagRequest(form));
  if (!parsed.success) {
    return dedupeIssues([...issues, ...zodIssues(parsed.error)]);
  }
  const definition = 'key' in parsed.data ? parsed.data : { ...parsed.data, key: form.key.trim() };
  return dedupeIssues([...issues, ...validateFlagConsistency(definition)]);
};

const dedupeIssues = (issues: readonly ValidationIssue[]): ValidationIssue[] => {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const id = `${issue.path}\n${issue.message}`;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

export const prerequisiteCycleIssues = (
  form: FlagFormState,
  flags: readonly Flag[]
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const flagKey = form.key.trim();
  for (const environment of form.environmentKeys) {
    const prerequisites = completePrerequisites(
      form.environments[environment]?.prerequisites ?? []
    ).map((item) => item.flag);
    if (prerequisites.length === 0 || !flagKey) {
      continue;
    }
    const graph = new Map<string, readonly string[]>();
    for (const flag of flags) {
      if (flag.key === flagKey) {
        continue;
      }
      graph.set(
        flag.key,
        (flag.environments[environment]?.prerequisites ?? []).map((item) => item.flag)
      );
    }
    graph.set(flagKey, prerequisites);
    const cycle = findPrerequisiteCycle(graph, flagKey);
    if (cycle) {
      issues.push({
        path: `environments.${environment}.prerequisites`,
        message: i18n.translate(
          'xpack.featureFlagsManagement.flags.editor.prerequisiteCycleErrorMessage',
          {
            defaultMessage: 'Prerequisites form a cycle: {cycle}.',
            values: { cycle: cycle.join(' → ') },
          }
        ),
      });
    }
  }
  return issues;
};
