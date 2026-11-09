/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_VALUE } from '../../../../threat_intelligence/constants/common';
import { useCanAttachToCase } from '../../hooks/use_can_attach_to_case';

/**
 * Decides if we enable or disable the add to existing and add to new case features.
 * If the Indicator has no name the features will be disabled.
 * If the user cannot attach to a case (see `useCanAttachToCase`) the features will be disabled.
 *
 * @param indicatorName the name of the indicator
 * @return true if the features are disabled
 */
export const useCaseDisabled = (indicatorName: string): boolean => {
  const canAttachToCase = useCanAttachToCase();

  // disable the item if there is no indicator name or if the user doesn't have the right permission
  // in the case's attachment, the indicator name is the link to open the flyout
  const invalidIndicatorName: boolean = indicatorName === EMPTY_VALUE;

  return invalidIndicatorName || !canAttachToCase;
};
