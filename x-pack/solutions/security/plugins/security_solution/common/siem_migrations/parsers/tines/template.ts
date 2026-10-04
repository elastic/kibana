/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slugifyStepName } from './slugify_step_name';

/** Matches Tines `<<agent.field.path>>` template pills. */
const TINES_REF_REGEX = /<<([^>]+?)>>/g;

const resolveStepName = (
  agentRef: string,
  agentNameToStepName: ReadonlyMap<string, string>
): { stepName: string; resolved: boolean } => {
  const slugifiedRef = slugifyStepName(agentRef);
  const direct =
    agentNameToStepName.get(agentRef) ?? agentNameToStepName.get(slugifiedRef) ?? undefined;

  if (direct !== undefined) {
    return { stepName: direct, resolved: true };
  }

  for (const [name, stepName] of agentNameToStepName) {
    if (slugifyStepName(name) === slugifiedRef) {
      return { stepName, resolved: true };
    }
  }

  return { stepName: slugifiedRef, resolved: false };
};

/**
 * Best-effort conversion of Tines `<<agent.field>>` references to Elastic Workflows
 * Liquid `{{ steps.agent.output.field }}` placeholders.
 *
 * Unresolved agent names are still converted using a slugified fallback and recorded
 * in `warnings` for the migration report.
 */
export const convertTinesTemplate = (
  template: string,
  agentNameToStepName: ReadonlyMap<string, string>,
  warnings: string[]
): string => {
  return template.replace(TINES_REF_REGEX, (_, ref: string) => {
    const trimmedRef = ref.trim();
    const [agentRef, ...fieldParts] = trimmedRef.split('.');
    const fieldPath = fieldParts.join('.');
    const { stepName, resolved } = resolveStepName(agentRef, agentNameToStepName);

    if (!resolved) {
      warnings.push(`Unresolved Tines template reference: <<${trimmedRef}>>`);
    }

    if (!fieldPath) {
      return `{{ steps.${stepName}.output }}`;
    }

    return `{{ steps.${stepName}.output.${fieldPath} }}`;
  });
};

/**
 * Converts a Tines formula/path reference such as `=receive_events.users` or
 * `receive_events.users` into a Liquid expression suitable for foreach/`with` values.
 */
export const convertTinesPathReference = (
  path: string,
  agentNameToStepName: ReadonlyMap<string, string>
): string => {
  const normalizedPath = path.startsWith('=') ? path.slice(1) : path;
  const [agentRef, ...fieldParts] = normalizedPath.split('.');
  const { stepName } = resolveStepName(agentRef, agentNameToStepName);
  const fieldPath = fieldParts.join('.');

  if (!fieldPath) {
    return `{{ steps.${stepName}.output }}`;
  }

  return `{{ steps.${stepName}.output.${fieldPath} }}`;
};
