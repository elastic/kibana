/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { WorkflowSchema, type WorkflowYaml } from '@kbn/workflows';

interface ValidateWorkflowYamlSuccess {
  ok: true;
  /** The parsed and validated workflow object */
  workflow: WorkflowYaml;
}

interface ValidateWorkflowYamlFailure {
  ok: false;
  /** Validation error messages */
  errors: string[];
}

export type ValidateWorkflowYamlResult = ValidateWorkflowYamlSuccess | ValidateWorkflowYamlFailure;

type ParseYamlResult = { ok: true; value: unknown } | { ok: false; error: string };

const tryParseYaml = (yamlString: string): ParseYamlResult => {
  try {
    return { ok: true, value: parse(yamlString) };
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    return { ok: false, error: `YAML parse error: ${message}` };
  }
};

/**
 * Parses a YAML string and validates it against the Elastic Workflows schema.
 *
 * 1. Parses the YAML string into a JavaScript object using the `yaml` package
 * 2. Validates the parsed object against `WorkflowSchema` from `@kbn/workflows`
 * 3. Returns the validated workflow on success, or an array of error messages on failure
 */
export const validateWorkflowYaml = (yamlString: string): ValidateWorkflowYamlResult => {
  // Step 1: Parse YAML string to object
  const parseResult = tryParseYaml(yamlString);

  if (!parseResult.ok) {
    return {
      errors: [parseResult.error],
      ok: false,
    };
  }

  const parsed = parseResult.value;

  if (parsed == null || typeof parsed !== 'object') {
    return {
      errors: ['YAML content did not parse to a valid object'],
      ok: false,
    };
  }

  // Step 2: Validate against WorkflowSchema
  const result = WorkflowSchema.safeParse(parsed);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';

      return `${path}: ${issue.message}`;
    });

    return {
      errors,
      ok: false,
    };
  }

  return {
    ok: true,
    workflow: result.data,
  };
};
