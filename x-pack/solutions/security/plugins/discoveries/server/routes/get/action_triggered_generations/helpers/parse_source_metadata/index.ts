/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SourceMetadataResponse {
  action_execution_uuid: string | undefined;
  rule_id: string | undefined;
  rule_name: string | undefined;
}

export const parseSourceMetadata = (
  reference: string | undefined
): SourceMetadataResponse | null => {
  if (reference == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(reference) as Record<string, unknown>;
    const sourceMetadata = parsed.sourceMetadata as
      | {
          actionExecutionUuid?: string;
          ruleId?: string;
          ruleName?: string;
        }
      | undefined;

    if (sourceMetadata == null) {
      return null;
    }

    return {
      action_execution_uuid: sourceMetadata.actionExecutionUuid,
      rule_id: sourceMetadata.ruleId,
      rule_name: sourceMetadata.ruleName,
    };
  } catch {
    return null;
  }
};
