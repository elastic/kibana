/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StepAccordion } from '../step_accordion';
import * as i18n from '../translations';

export interface GenerationStepProps {
  children?: React.ReactNode;
  isLast?: boolean;
}

const GenerationStepComponent: React.FC<GenerationStepProps> = ({ children, isLast }) => (
  <StepAccordion
    data-test-subj="generationStep"
    description={i18n.GENERATION_SECTION_DESCRIPTION}
    isLast={isLast}
    stepNumber="2"
    title={i18n.GENERATION_SECTION_TITLE}
  >
    {children}
  </StepAccordion>
);

GenerationStepComponent.displayName = 'GenerationStep';

export const GenerationStep = React.memo(GenerationStepComponent);
