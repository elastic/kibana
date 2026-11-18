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
import type { TimestampFieldCapsResponse } from '../utils/utils';
import {
  hasTimestampFields,
  isMachineLearningParams,
  isThreatParams,
  checkForFrozenIndices,
  PARTIAL_INDEX_PREFIX,
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
  dateNanosTimestampFields: string[];
  mixedTimestampFields: string[];
}

interface IndexResolution {
  matchedIndices: string[];
  /** The timestamp fields come with the same request that resolved the indices. */
  timestampFieldCapsResponse: TimestampFieldCapsResponse;
}

// date_nanos sort values need special handling in search_after pagination
const getDateNanosTimestampFields = (
  timestampFields: string[],
  fieldCapsResponse: TimestampFieldCapsResponse
): Pick<RunExecutionValidationResult, 'dateNanosTimestampFields' | 'mixedTimestampFields'> => ({
  dateNanosTimestampFields: timestampFields.filter(
    (field) => 'date_nanos' in (fieldCapsResponse.body.fields[field] ?? {})
  ),
  mixedTimestampFields: timestampFields.filter((field) => {
    const types = fieldCapsResponse.body.fields[field];
    return types != null && 'date' in types && 'date_nanos' in types;
  }),
});

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
  let dateNanosTimestampFields: string[] = [];
  let mixedTimestampFields: string[] = [];

  if (isMachineLearningParams(params)) {
    return {
      skipExecution: false,
      warnings: [],
      frozenIndicesQueriedCount: 0,
      dateNanosTimestampFields: [],
      mixedTimestampFields: [],
    };
  }

  const timestampFields = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const indexPatterns = new IndexPatternsFetcher(scopedClusterClient.asCurrentUser);

  const resolveIndices = async ({
    patterns,
    patternsRuntimeMappings,
    spanName,
  }: {
    patterns: string[];
    patternsRuntimeMappings?: estypes.MappingRuntimeFields;
    spanName: string;
  }): Promise<IndexResolution> => {
    const { matchedIndices, fields } = await withSecuritySpan(spanName, () =>
      indexPatterns.getMatchedIndices({
        indexPatterns: patterns,
        fields: timestampFields,
        includeUnmapped: true,
        runtimeMappings: patternsRuntimeMappings,
      })
    );

    return {
      matchedIndices,
      timestampFieldCapsResponse: { body: { indices: matchedIndices, fields } },
    };
  };

  const warnAboutMissingTimestampFields = async (
    timestampFieldCapsResponse: TimestampFieldCapsResponse
  ): Promise<void> => {
    const { warningMessage } = await hasTimestampFields({
      timestampField: primaryTimestamp,
      timestampFieldCapsResponse,
      ruleExecutionLogger,
    });
    if (warningMessage) {
      warnings.push(warningMessage);
    }
  };

  let inputIndexResolution: IndexResolution | undefined;

  // The frozen indices request adds a time range filter to the request that resolved the indices, which
  // can only narrow the result. It only runs when that request found a partially mounted index: without
  // one there is nothing to find, and after a failure it would fail as well.
  const shouldCheckFrozenIndices = (): boolean =>
    inputIndexResolution?.matchedIndices.some((index) => index.startsWith(PARTIAL_INDEX_PREFIX)) ===
    true;

  try {
    inputIndexResolution = await resolveIndices({
      patterns: inputIndex,
      patternsRuntimeMappings: runtimeMappings,
      spanName: 'fieldCaps',
    });

    // Collect rule execution metrics
    ruleExecutionLogger.logMetric(
      'matched_indices_count',
      inputIndexResolution.matchedIndices.length
    );

    if (inputIndexResolution.matchedIndices.length === 0) {
      warnings.push(
        `Unable to find matching indices for rule ${ruleName}. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.`
      );
      skipExecution = true;
    }
  } catch (exc) {
    warnings.push(`Encountered an error validating index patterns: ${exc}`);
  }

  if (isThreatParams(params)) {
    let threatIndexResolution: IndexResolution | undefined;

    try {
      threatIndexResolution = await resolveIndices({
        patterns: params.threatIndex,
        spanName: 'fieldCapsThreatIndex',
      });

      if (threatIndexResolution.matchedIndices.length === 0) {
        warnings.push(
          `Unable to find matching threat indicator indices for rule ${ruleName}. This warning will persist until one of the following occurs: a matching threat index is created or the rule is disabled.`
        );
        skipExecution = true;
      }
    } catch (exc) {
      warnings.push(`Encountered an error validating threat index patterns: ${exc}`);
    }

    // A failed index resolution has no timestamp fields to check and its error is already reported
    if (!skipExecution && threatIndexResolution != null) {
      try {
        await warnAboutMissingTimestampFields(threatIndexResolution.timestampFieldCapsResponse);
      } catch (exc) {
        warnings.push(`Threat index timestamp fields check failed to execute ${exc}`);
      }
    }
  }

  if (skipExecution) {
    return {
      skipExecution,
      warnings,
      frozenIndicesQueriedCount,
      dateNanosTimestampFields,
      mixedTimestampFields,
    };
  }

  if (inputIndexResolution != null) {
    try {
      const { timestampFieldCapsResponse } = inputIndexResolution;

      await warnAboutMissingTimestampFields(timestampFieldCapsResponse);

      ({ dateNanosTimestampFields, mixedTimestampFields } = getDateNanosTimestampFields(
        timestampFields,
        timestampFieldCapsResponse
      ));
    } catch (exc) {
      warnings.push(`Timestamp fields check failed to execute ${exc}`);
    }
  }

  if (!isServerless && shouldCheckFrozenIndices()) {
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

  return {
    skipExecution,
    warnings,
    frozenIndicesQueriedCount,
    dateNanosTimestampFields,
    mixedTimestampFields,
  };
};
