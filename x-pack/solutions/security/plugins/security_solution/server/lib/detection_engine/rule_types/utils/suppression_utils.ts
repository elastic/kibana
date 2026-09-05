/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, sortBy } from 'lodash';

import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import type {
  AlertSuppressionCamel,
  AlertSuppressionGroupByFieldV2,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { getEffectiveSuppressionGroupByFields } from './effective_alert_suppression_fields';
import type { ExtraFieldsForShellAlert } from '../eql/build_alert_group_from_sequence';
import { robustGet } from './source_fields_merging/utils/robust_field_access';
import type { SearchTypes } from '../../../../../common/detection_engine/types';

export interface SuppressionTerm {
  field: string;
  value: SearchTypes | null;
}

const getAlertSuppressionV2Entries = (
  alertSuppression: AlertSuppressionCamel | undefined
): AlertSuppressionGroupByFieldV2[] | undefined => {
  const v2 = alertSuppression?.groupByV2;
  if (v2 != null && v2.length > 0) {
    return v2;
  }
  return undefined;
};

/**
 * Reads `sequence_index` from a `group_by_v2` entry. The rule schema defines this field with a
 * snake_case key, but `convertObjectKeysToCamelCase` is applied to `alert_suppression` when
 * converting saved rule params into the alerting framework's camel-cased shape, so at runtime
 * the entry may carry the value under `sequenceIndex` instead. Read both spellings to remain
 * resilient regardless of which conversion path produced the entry.
 */
const getSequenceIndex = (entry: AlertSuppressionGroupByFieldV2): number | undefined => {
  if (entry.sequence_index != null) {
    return entry.sequence_index;
  }
  const camelEntry = entry as { sequenceIndex?: number };
  return camelEntry.sequenceIndex;
};

/**
 * Builds suppression terms for EQL sequence shell alerts. When `groupByV2` includes
 * `sequence_index`, field values are read from that sequence event's building-block document;
 * otherwise values come from the merged shell alert document (same as non-sequence rules).
 */
export const getEqlSequenceSuppressionTerms = ({
  alertSuppression,
  shellAlertSource,
  buildingBlockSources,
}: {
  alertSuppression: AlertSuppressionCamel | undefined;
  shellAlertSource: Record<string, unknown>;
  buildingBlockSources: Array<Record<string, unknown> | undefined>;
}): SuppressionTerm[] => {
  const v2Entries = getAlertSuppressionV2Entries(alertSuppression);
  if (v2Entries != null) {
    return v2Entries.map((entry) => {
      const sequenceIndex = getSequenceIndex(entry);
      const doc = sequenceIndex != null ? buildingBlockSources[sequenceIndex] : shellAlertSource;
      const value = doc != null ? robustGet({ document: doc, key: entry.field }) ?? null : null;
      const sortedValue = Array.isArray(value) ? (sortBy(value) as string[] | number[]) : value;
      return {
        field: entry.field,
        value: sortedValue,
      };
    });
  }
  return getSuppressionTerms({ alertSuppression, input: shellAlertSource });
};

/**
 * For `missingFieldsStrategy: doNotSuppress`, sequence alerts are only suppressible when every
 * suppression field is present on the appropriate document (shell merge vs specific sequence index).
 */
export const eqlSequenceHasAllSuppressionFieldValues = ({
  alertSuppression,
  shellAlertSource,
  buildingBlockSources,
}: {
  alertSuppression: AlertSuppressionCamel | undefined;
  shellAlertSource: Record<string, unknown>;
  buildingBlockSources: Array<Record<string, unknown> | undefined>;
}): boolean => {
  const v2Entries = getAlertSuppressionV2Entries(alertSuppression);
  if (v2Entries != null) {
    return v2Entries.every((entry) => {
      const sequenceIndex = getSequenceIndex(entry);
      const doc = sequenceIndex != null ? buildingBlockSources[sequenceIndex] : shellAlertSource;
      return doc != null && robustGet({ key: entry.field, document: doc }) != null;
    });
  }
  const legacyFields = getEffectiveSuppressionGroupByFields(alertSuppression);
  return legacyFields.every(
    (field) => robustGet({ key: field, document: shellAlertSource }) != null
  );
};

/**
 * returns an object containing the standard suppression fields (ALERT_INSTANCE_ID, ALERT_SUPPRESSION_TERMS, etc), with corresponding values populated from the `fields` parameter.
 */
export const getSuppressionAlertFields = ({
  primaryTimestamp,
  secondaryTimestamp,
  fields,
  suppressionTerms,
  fallbackTimestamp,
  instanceId,
}: {
  fields: Record<string, string | number | null> | undefined;
  primaryTimestamp: string;
  secondaryTimestamp?: string;
  suppressionTerms: SuppressionTerm[];
  fallbackTimestamp: string;
  instanceId: string;
}) => {
  const suppressionTime = new Date(
    get(fields, primaryTimestamp) ??
      (secondaryTimestamp && get(fields, secondaryTimestamp)) ??
      fallbackTimestamp
  );

  const suppressionFields: ExtraFieldsForShellAlert = {
    [ALERT_INSTANCE_ID]: instanceId,
    [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
    [ALERT_SUPPRESSION_START]: suppressionTime,
    [ALERT_SUPPRESSION_END]: suppressionTime,
    [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
  };

  return suppressionFields;
};

/**
 * generates values from a source event for the fields provided in the alertSuppression object
 * @param alertSuppression {@link AlertSuppressionCamel} options defining how to suppress alerts
 * @param input source data from either the _source of "fields" property on the event
 * returns an array of {@link SuppressionTerm}s by retrieving the appropriate field values based on the provided alertSuppression configuration
 */
export const getSuppressionTerms = ({
  alertSuppression,
  input,
}: {
  alertSuppression: AlertSuppressionCamel | undefined;
  input: Record<string, unknown> | undefined;
}): SuppressionTerm[] => {
  const suppressedBy = getEffectiveSuppressionGroupByFields(alertSuppression);
  const suppressionTerms = suppressedBy.map((field) => {
    const value = input != null ? robustGet({ document: input, key: field }) ?? null : null;
    const sortedValue = Array.isArray(value) ? (sortBy(value) as string[] | number[]) : value;
    return {
      field,
      value: sortedValue,
    };
  });

  return suppressionTerms;
};
