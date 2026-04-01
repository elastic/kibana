/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ExtractWorkflowYamlSuccess {
  ok: true;
  /** The extracted YAML string */
  yaml: string;
}

interface ExtractWorkflowYamlFailure {
  ok: false;
  error: string;
}

export type ExtractWorkflowYamlResult = ExtractWorkflowYamlSuccess | ExtractWorkflowYamlFailure;

/**
 * Regex to match YAML content within markdown code fences.
 *
 * Matches patterns like:
 *   ```yaml\n...\n```
 *   ```yml\n...\n```
 *   ```\n...\n```
 *
 * The `s` flag enables dotAll mode so `.` matches newlines.
 */
const CODE_FENCE_REGEX = /```(?:ya?ml)?\s*\n(.*?)\n\s*```/s;

/**
 * Checks whether a string looks like raw YAML workflow content
 * by testing for common top-level workflow keys.
 */
const looksLikeWorkflowYaml = (text: string): boolean => {
  const trimmed = text.trim();

  return (
    trimmed.startsWith('name:') ||
    trimmed.startsWith('version:') ||
    trimmed.startsWith('description:')
  );
};

/**
 * Extracts workflow YAML from an agent response message.
 *
 * Handles the following formats:
 * 1. YAML inside markdown code fences (```yaml ... ``` or ``` ... ```)
 * 2. Raw YAML content (starts with common workflow keys like `name:`)
 * 3. Returns an error when no valid YAML can be found
 */
export const extractWorkflowYaml = (agentResponseMessage: string): ExtractWorkflowYamlResult => {
  if (!agentResponseMessage.trim()) {
    return {
      error: 'Agent response message is empty',
      ok: false,
    };
  }

  // Try to extract YAML from markdown code fences first
  const codeFenceMatch = agentResponseMessage.match(CODE_FENCE_REGEX);

  if (codeFenceMatch?.[1]) {
    const yaml = codeFenceMatch[1].trim();

    if (!yaml) {
      return {
        error: 'Code fence was found but contained no YAML content',
        ok: false,
      };
    }

    return {
      ok: true,
      yaml,
    };
  }

  // Fall back to detecting raw YAML content
  if (looksLikeWorkflowYaml(agentResponseMessage)) {
    return {
      ok: true,
      yaml: agentResponseMessage.trim(),
    };
  }

  return {
    error:
      'Could not extract workflow YAML from agent response. Expected YAML in a markdown code fence (```yaml ... ```) or raw YAML starting with a workflow key (name:, version:, description:).',
    ok: false,
  };
};
