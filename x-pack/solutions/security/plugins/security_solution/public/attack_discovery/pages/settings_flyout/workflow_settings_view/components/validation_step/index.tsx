/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { useWorkflowEditorLink } from '../../../../use_workflow_editor_link';

export interface ValidationStepProps {
  validationPanel: React.ReactNode;
}

const CUSTOM_VALIDATION_EXAMPLE_ALIAS = 'attack-discovery-custom-validation-example';

const ValidationStepComponent: React.FC<ValidationStepProps> = ({ validationPanel }) => {
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: CUSTOM_VALIDATION_EXAMPLE_ALIAS,
    workflowRunId: null,
  });

  const description = useMemo(
    () => (
      <FormattedMessage
        id="xpack.discoveries.components.validationSectionDescription"
        defaultMessage="Choose how discoveries are {validated} or enriched before they are saved as attacks."
        values={{
          validated:
            editorUrl != null ? (
              <EuiLink
                data-test-subj="validationCustomExampleLink"
                href={editorUrl}
                target="_blank"
              >
                {'validated'}
              </EuiLink>
            ) : (
              'validated'
            ),
        }}
      />
    ),
    [editorUrl]
  );

  return (
    <>
      <EuiText color="subdued" data-test-subj="validationStepDescription" size="s">
        {description}
      </EuiText>

      <EuiSpacer size="m" />

      {validationPanel}
    </>
  );
};

ValidationStepComponent.displayName = 'ValidationStep';

export const ValidationStep = React.memo(ValidationStepComponent);
