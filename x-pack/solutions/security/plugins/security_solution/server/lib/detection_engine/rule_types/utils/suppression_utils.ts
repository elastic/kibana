/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/get';
import sortBy from 'lodash/sortBy';

import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import type { ExtraFieldsForShellAlert } from '../eql/build_alert_group_from_sequence';
import { robustGet } from './source_fields_merging/utils/robust_field_access';
import type { SearchTypes } from '../../../../../common/detection_engine/types';

export interface SuppressionTerm {
  field: string;
  value: SearchTypes | null;
}

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
  const suppressedBy = alertSuppression?.groupBy ?? [];
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
