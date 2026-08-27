/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entriesList } from '@kbn/securitysolution-io-ts-list-types';
import type { SecuritySharedParams } from '../types';
import { isThreatParams } from './utils';

/**
 * Computes an explicit list of fields to request in event searches instead of the `fields: '*'`
 * wildcard, covering everything the alert creation path reads from the `fields` response block:
 * suppression groupBy values, large value-list exception fields, threat mapping event fields,
 * runtime fields, timestamps and constant_keyword fields the `missingFields` merge strategy
 * copies into `_source`. Returns undefined when the wildcard request must be kept.
 */
export const getRequestedEventFields = (
  sharedParams: SecuritySharedParams
): string[] | undefined => {
  const {
    experimentalFeatures,
    mergeStrategy,
    completeRule,
    unprocessedExceptions,
    runtimeMappings,
    primaryTimestamp,
    secondaryTimestamp,
    constantKeywordFields,
  } = sharedParams;

  if (!experimentalFeatures.reducedEventFieldsRequestEnabled) {
    return undefined;
  }

  // the allFields merge strategy overwrites `_source` with every entry of the `fields`
  // response block, narrowing the request would narrow the merge semantics
  if (mergeStrategy === 'allFields') {
    return undefined;
  }

  const { ruleParams } = completeRule;

  const alertSuppression =
    'alertSuppression' in ruleParams ? ruleParams.alertSuppression : undefined;
  const suppressionFields =
    alertSuppression && 'groupBy' in alertSuppression ? alertSuppression.groupBy : [];

  const threatMappingFields = isThreatParams(ruleParams)
    ? ruleParams.threatMapping.flatMap(({ entries }) => entries.map(({ field }) => field))
    : [];

  const largeValueListFields = unprocessedExceptions.flatMap((exceptionItem) =>
    exceptionItem.entries.filter(entriesList.is).map(({ field }) => field)
  );

  return Array.from(
    new Set([
      '@timestamp',
      primaryTimestamp,
      ...(secondaryTimestamp ? [secondaryTimestamp] : []),
      ...Object.keys(runtimeMappings ?? {}),
      ...suppressionFields,
      ...threatMappingFields,
      ...largeValueListFields,
      ...constantKeywordFields,
    ])
  );
};
