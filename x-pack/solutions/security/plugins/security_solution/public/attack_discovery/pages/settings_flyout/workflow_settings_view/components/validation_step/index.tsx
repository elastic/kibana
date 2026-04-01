/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';

export interface ValidationStepProps {
  validationPanel: React.ReactNode;
}

const ValidationStepComponent: React.FC<ValidationStepProps> = ({ validationPanel }) => (
  <>
    <EuiText color="subdued" size="s">
      {i18n.VALIDATION_SECTION_DESCRIPTION}
    </EuiText>

    <EuiSpacer size="m" />

    {validationPanel}
  </>
);

ValidationStepComponent.displayName = 'ValidationStep';

export const ValidationStep = React.memo(ValidationStepComponent);
