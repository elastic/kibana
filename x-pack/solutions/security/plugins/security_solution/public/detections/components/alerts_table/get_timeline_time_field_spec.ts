/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TIMESTAMP_RUNTIME_FIELD } from '../../../../common/detection_engine/constants';
import { ALERT_RULE_TIMESTAMP_OVERRIDE } from '../../../../common/field_maps/field_names';
import type { TimeFieldSpec } from '../../../data_view_manager/redux/actions';
import { getField } from '../../../helpers';

const getFirstValue = <T>(value: T | T[] | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value;

// Data view runtime fields don't support script params, so field names are inlined as string literals.
const buildEmitIfPresent = (field: string): string => {
  const quotedField = JSON.stringify(field);
  return `if (doc.containsKey(${quotedField}) && doc[${quotedField}].size() != 0) { emit(doc[${quotedField}].value.toInstant().toEpochMilli()); }`;
};

/**
 * Returns the time field Timeline should filter on to match how the alert's rule selected source events.
 */
export const getTimelineTimeFieldSpec = (alertDoc: Ecs): TimeFieldSpec | undefined => {
  const timestampOverride: string | undefined = getFirstValue(
    getField(alertDoc, `${ALERT_RULE_PARAMETERS}.timestamp_override`) ??
      getField(alertDoc, ALERT_RULE_TIMESTAMP_OVERRIDE)
  );

  if (!timestampOverride || timestampOverride === TIMESTAMP) {
    return undefined;
  }

  const isFallbackDisabled =
    getFirstValue(
      getField(alertDoc, `${ALERT_RULE_PARAMETERS}.timestamp_override_fallback_disabled`)
    ) === true;

  if (isFallbackDisabled) {
    return { timeFieldName: timestampOverride };
  }

  return {
    timeFieldName: TIMESTAMP_RUNTIME_FIELD,
    runtimeFieldMap: {
      [TIMESTAMP_RUNTIME_FIELD]: {
        type: 'date',
        script: {
          source: `${buildEmitIfPresent(timestampOverride)} else ${buildEmitIfPresent(TIMESTAMP)}`,
        },
      },
    },
  };
};
