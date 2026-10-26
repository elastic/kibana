/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepDataType } from '../..';
import * as i18n from '../../translations';

/**
 * Returns a data-type-aware description prefix for the workflow description.
 * When `dataCount` is known, a count is included; otherwise a generic label is used.
 */
export const getWorkflowDescriptionPrefix = (
  dataCount: number | null,
  dataType: StepDataType
): string => {
  switch (dataType) {
    case 'discoveries':
      return dataCount != null
        ? i18n.N_DISCOVERIES_GENERATED_BY_WORKFLOW(dataCount)
        : i18n.DISCOVERIES_GENERATED_BY_WORKFLOW;
    case 'validated_discoveries':
      return dataCount != null
        ? i18n.N_DISCOVERIES_VALIDATED_BY_WORKFLOW(dataCount)
        : i18n.DISCOVERIES_VALIDATED_BY_WORKFLOW;
    case 'alerts':
    default:
      return dataCount != null ? i18n.N_ALERTS_FROM_WORKFLOW(dataCount) : i18n.ALERTS_FROM_WORKFLOW;
  }
};
