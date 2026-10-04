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
  /**
   * Whether a threat index name is a value list's lookup index, which carries no
   * timestamp field on purpose (a list is read whole, not by time window).
   */
  isValueListLookupIndex?: (indexName: string) => boolean;
}

export interface RunExecutionValidationResult {
  skipExecution: boolean;
  warnings: string[];
  frozenIndicesQueriedCount: number;
  dateNanosTimestampFields: string[];
  mixedTimestampFields: string[];
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
    isValueListLookupIndex,
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

  try {
    const { matchedIndexPatterns, matchedIndices } = await indexPatterns.getIndexPatternMatches(
      inputIndex
    );

    // Collect rule execution metrics
    ruleExecutionLogger.logMetric('matched_indices_count', matchedIndices?.length);

    if (matchedIndexPatterns.length === 0) {
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
      const { matchedIndexPatterns: matchedThreatIndexPatterns } =
        await indexPatterns.getIndexPatternMatches(params.threatIndex);

      if (matchedThreatIndexPatterns.length === 0) {
        warnings.push(
          `Unable to find matching threat indicator indices for rule ${ruleName}. This warning will persist until one of the following occurs: a matching threat index is created or the rule is disabled.`
        );
        skipExecution = true;
      }
    } catch (exc) {
      warnings.push(`Encountered an error validating threat index patterns: ${exc}`);
    }

    if (!skipExecution) {
      // The concrete indices the threat patterns resolve to. A rule may name a lookup list
      // by its alias, which the field caps response resolves to the concrete index; the
      // names the rule typed are kept as a fallback when the request fails.
      let resolvedThreatIndices: string[] = params.threatIndex;
      try {
        const threatFieldCapsResponse = await withSecuritySpan('fieldCapsThreatIndex', () =>
          scopedClusterClient.asCurrentUser.fieldCaps(
            {
              index: params.threatIndex,
              fields: timestampFields,
              include_unmapped: true,
              ignore_unavailable: true,
            },
            { meta: true }
          )
        );
        const { indices } = threatFieldCapsResponse.body;
        resolvedThreatIndices = Array.isArray(indices) ? indices : [indices];

        const { warningMessage: missingThreatTimestampWarning } = await hasTimestampFields({
          timestampField: primaryTimestamp,
          timestampFieldCapsResponse: threatFieldCapsResponse,
          ruleExecutionLogger,
          isTimestampOptional: isValueListLookupIndex,
        });
        if (missingThreatTimestampWarning) {
          warnings.push(missingThreatTimestampWarning);
        }
      } catch (exc) {
        warnings.push(`Threat index timestamp fields check failed to execute ${exc}`);
      }

      // The timestamp check above is skipped for a value list's lookup index, which has
      // no timestamp field. The threat query still applies to it, and the product default
      // filters on `@timestamp`, so such a rule would match no indicators with no sign of
      // why. Say so instead of running silently against nothing. Both the rule's timestamp
      // field and `@timestamp` are looked for, since the default query names the latter
      // whatever the rule's timestamp override is.
      const lookupThreatIndices = [
        ...new Set([...params.threatIndex, ...resolvedThreatIndices]),
      ].filter((name) => isValueListLookupIndex?.(name) === true);
      const filteredTimestamp = [primaryTimestamp, '@timestamp'].find((field) =>
        params.threatQuery.includes(field)
      );
      if (lookupThreatIndices.length > 0 && filteredTimestamp != null) {
        warnings.push(
          `The threat query filters on "${filteredTimestamp}", but the value list lookup ${
            lookupThreatIndices.length === 1 ? 'index' : 'indices'
          } ${lookupThreatIndices.join(
            ', '
          )} carries no timestamp field, so no indicator from it can match. Use a threat query that does not filter on the timestamp, such as "*:*", for a value list.`
        );
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

  try {
    const fieldCapsResponse = await withSecuritySpan('fieldCaps', () =>
      scopedClusterClient.asCurrentUser.fieldCaps(
        {
          index: inputIndex,
          fields: timestampFields,
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

    // date_nanos sort values need special handling in search_after pagination
    dateNanosTimestampFields = timestampFields.filter(
      (field) => 'date_nanos' in (fieldCapsResponse.body.fields[field] ?? {})
    );
    mixedTimestampFields = timestampFields.filter((field) => {
      const types = fieldCapsResponse.body.fields[field];
      return types != null && 'date' in types && 'date_nanos' in types;
    });
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

  return {
    skipExecution,
    warnings,
    frozenIndicesQueriedCount,
    dateNanosTimestampFields,
    mixedTimestampFields,
  };
};
