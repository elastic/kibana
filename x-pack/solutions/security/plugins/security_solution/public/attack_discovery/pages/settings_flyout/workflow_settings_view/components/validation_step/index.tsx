/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export interface ValidationStepProps {
  validationPanel: React.ReactNode;
}

const ValidationStepComponent: React.FC<ValidationStepProps> = ({ validationPanel }) => (
  <>
    <EuiText color="subdued" data-test-subj="validationStepDescription" size="s">
      <FormattedMessage
        id="xpack.securitySolution.attackDiscovery.workflowSettingsView.validationSectionDescription"
        defaultMessage="Choose how discoveries are validated or enriched before they are saved as attacks."
      />
    </EuiText>

    <EuiSpacer size="m" />

    {validationPanel}
  </>
);

ValidationStepComponent.displayName = 'ValidationStep';

export const ValidationStep = React.memo(ValidationStepComponent);
