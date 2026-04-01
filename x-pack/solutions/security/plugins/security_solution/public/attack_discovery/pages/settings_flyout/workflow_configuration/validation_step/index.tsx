/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StepAccordion } from '../step_accordion';
import * as i18n from '../translations';

export interface ValidationStepProps {
  children: React.ReactNode;
  hasError?: boolean;
  isLast?: boolean;
}

const ValidationStepComponent: React.FC<ValidationStepProps> = ({
  children,
  hasError = false,
  isLast,
}) => (
  <StepAccordion
    data-test-subj="validationStep"
    description={i18n.VALIDATION_SECTION_DESCRIPTION}
    hasError={hasError}
    isLast={isLast}
    stepNumber="3"
    title={i18n.VALIDATION_SECTION_TITLE}
  >
    {children}
  </StepAccordion>
);

ValidationStepComponent.displayName = 'ValidationStep';

export const ValidationStep = React.memo(ValidationStepComponent);
