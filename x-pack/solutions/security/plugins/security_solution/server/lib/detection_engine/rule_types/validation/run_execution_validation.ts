/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type { RuleParams } from '../../rule_schema';
import {
  hasTimestampFields,
  isMachineLearningParams,
  isThreatParams,
  checkForFrozenIndices,
} from '../utils/utils';
import { withSecuritySpan } from '../../../../utils/with_security_span';

export interface RunExecutionValidationParams {
  params: RuleParams;
  inputIndex: string[];
  ruleName: string;
  scopedClusterClient: IScopedClusterClient;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: string;
  secondaryTimestamp: string | undefined;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  isServerless: boolean;
}

export interface RunExecutionValidationResult {
  skipExecution: boolean;
  warnings: string[];
  frozenIndicesQueriedCount: number;
}

/**
 * Runs pre-execution validation for a security rule: index pattern resolution,
 * threat index validation (for indicator match rules), timestamp field checks,
 * and frozen indices detection. Returns warnings and whether execution should be skipped.
 */
export const runExecutionValidation = async (
  options: RunExecutionValidationParams
): Promise<RunExecutionValidationResult> => {
  const {
    params,
    inputIndex,
    ruleName,
    scopedClusterClient,
    runtimeMappings,
    primaryTimestamp,
    secondaryTimestamp,
    ruleExecutionLogger,
    isServerless,
  } = options;

  const warnings: string[] = [];
  let skipExecution = false;
  let frozenIndicesQueriedCount = 0;

  if (isMachineLearningParams(params)) {
    return { skipExecution: false, warnings: [], frozenIndicesQueriedCount: 0 };
  }

  const indexPatterns = new IndexPatternsFetcher(scopedClusterClient.asCurrentUser);

  try {
    const indexPatternsWithMatches = await indexPatterns.getIndexPatternsWithMatches(inputIndex);

    if (indexPatternsWithMatches.length === 0) {
      warnings.push(
        `Unable to find matching indices for rule ${ruleName}. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.`
      );
      skipExecution = true;
    }
  } catch (exc) {
    warnings.push(`Encountered an error validating index patterns: ${exc}`);
  }

  if (isThreatParams(params)) {
    try {
      const threatIndexPatternsWithMatches = await indexPatterns.getIndexPatternsWithMatches(
        params.threatIndex
      );

      if (threatIndexPatternsWithMatches.length === 0) {
        warnings.push(
          `Unable to find matching threat indicator indices for rule ${ruleName}. This warning will persist until one of the following occurs: a matching threat index is created or the rule is disabled.`
        );
        skipExecution = true;
      }
    } catch (exc) {
      warnings.push(`Encountered an error validating threat index patterns: ${exc}`);
    }

    if (!skipExecution) {
      try {
        const threatFieldCapsResponse = await withSecuritySpan('fieldCapsThreatIndex', () =>
          scopedClusterClient.asCurrentUser.fieldCaps(
            {
              index: params.threatIndex,
              fields: secondaryTimestamp
                ? [primaryTimestamp, secondaryTimestamp]
                : [primaryTimestamp],
              include_unmapped: true,
              ignore_unavailable: true,
            },
            { meta: true }
          )
        );

        const { warningMessage: missingThreatTimestampWarning } = await hasTimestampFields({
          timestampField: primaryTimestamp,
          timestampFieldCapsResponse: threatFieldCapsResponse,
          ruleExecutionLogger,
        });
        if (missingThreatTimestampWarning) {
          warnings.push(missingThreatTimestampWarning);
        }
      } catch (exc) {
        warnings.push(`Threat index timestamp fields check failed to execute ${exc}`);
      }
    }
  }

  if (skipExecution) {
    return { skipExecution, warnings, frozenIndicesQueriedCount };
  }

  try {
    const fieldCapsResponse = await withSecuritySpan('fieldCaps', () =>
      scopedClusterClient.asCurrentUser.fieldCaps(
        {
          index: inputIndex,
          fields: secondaryTimestamp ? [primaryTimestamp, secondaryTimestamp] : [primaryTimestamp],
          include_unmapped: true,
          runtime_mappings: runtimeMappings,
          ignore_unavailable: true,
        },
        { meta: true }
      )
    );

    const { warningMessage: missingTimestampWarning } = await hasTimestampFields({
      timestampField: primaryTimestamp,
      timestampFieldCapsResponse: fieldCapsResponse,
      ruleExecutionLogger,
    });
    if (missingTimestampWarning) {
      warnings.push(missingTimestampWarning);
    }
  } catch (exc) {
    warnings.push(`Timestamp fields check failed to execute ${exc}`);
  }

  if (!isServerless) {
    try {
      const frozenIndices = await checkForFrozenIndices({
        inputIndices: inputIndex,
        internalEsClient: scopedClusterClient.asInternalUser,
        currentUserEsClient: scopedClusterClient.asCurrentUser,
        to: params.to,
        from: params.from,
        primaryTimestamp,
        secondaryTimestamp,
      });

      if (frozenIndices.length > 0) {
        frozenIndicesQueriedCount = frozenIndices.length;
      }
    } catch (exc) {
      warnings.push(`Frozen indices check failed to execute ${exc}`);
    }
  }

  return { skipExecution, warnings, frozenIndicesQueriedCount };
};
