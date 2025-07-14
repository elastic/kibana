/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threshold } from '../../api/detection_engine';

interface ValidationPayload {
  type?: string;
  threshold?: Threshold;
}

type ThresholdExtraValidation = (props: Threshold) => string[];

export const validateThresholdBase = (
  props: ValidationPayload,
  extraValidation?: ThresholdExtraValidation
): string[] => {
  const errors: string[] = [];

  if (props.type !== 'threshold') {
    return errors;
  }

  if (!props.threshold) {
    errors.push('when "type" is "threshold", "threshold" is required');
    return errors;
  }

  const { field, cardinality } = props.threshold;

  if (cardinality?.length && field.includes(cardinality[0].field)) {
    errors.push('Cardinality of a field that is being aggregated on is always 1');
  }

  if (Array.isArray(field) && field.length > 5) {
    errors.push('Number of fields must be 5 or less');
  }

  if (extraValidation) {
    errors.push(...extraValidation(props.threshold));
  }

  return errors;
};
