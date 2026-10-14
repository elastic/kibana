/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StepAccordion } from '../step_accordion';
import * as i18n from '../translations';

export interface AlertRetrievalStepProps {
  children: React.ReactNode;
  hasError?: boolean;
  isLast?: boolean;
}

const AlertRetrievalStepComponent: React.FC<AlertRetrievalStepProps> = ({
  children,
  hasError = false,
  isLast,
}) => (
  <StepAccordion
    data-test-subj="alertRetrievalStep"
    description={i18n.ALERT_RETRIEVAL_SECTION_DESCRIPTION}
    hasError={hasError}
    isLast={isLast}
    stepNumber="1"
    title={i18n.ALERT_RETRIEVAL_SECTION_TITLE}
  >
    {children}
  </StepAccordion>
);

AlertRetrievalStepComponent.displayName = 'AlertRetrievalStep';

export const AlertRetrievalStep = React.memo(AlertRetrievalStepComponent);
