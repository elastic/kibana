/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';

export interface GenerationStepProps {
  connectorSelector?: React.ReactNode;
}

const GenerationStepComponent: React.FC<GenerationStepProps> = ({ connectorSelector }) => (
  <>
    <EuiText color="subdued" size="s">
      {i18n.GENERATION_SECTION_DESCRIPTION}
    </EuiText>

    <EuiSpacer size="m" />

    {connectorSelector}
  </>
);

GenerationStepComponent.displayName = 'GenerationStep';

export const GenerationStep = React.memo(GenerationStepComponent);
