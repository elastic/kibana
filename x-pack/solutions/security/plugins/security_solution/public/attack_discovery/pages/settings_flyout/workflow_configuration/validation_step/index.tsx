/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import { StepAccordion } from '../step_accordion';
import * as i18n from '../translations';

export interface ValidationStepProps {
  children: React.ReactNode;
  hasError?: boolean;
  isLast?: boolean;
}

const CUSTOM_VALIDATION_EXAMPLE_ALIAS = 'attack-discovery-custom-validation-example';

const ValidationStepComponent: React.FC<ValidationStepProps> = ({
  children,
  hasError = false,
  isLast,
}) => {
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: CUSTOM_VALIDATION_EXAMPLE_ALIAS,
    workflowRunId: null,
  });

  const description = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.attackDiscovery.workflowConfiguration.validationSectionDescription"
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
    <StepAccordion
      data-test-subj="validationStep"
      description={description}
      hasError={hasError}
      isLast={isLast}
      stepNumber="3"
      title={i18n.VALIDATION_SECTION_TITLE}
    >
      {children}
    </StepAccordion>
  );
};

ValidationStepComponent.displayName = 'ValidationStep';

export const ValidationStep = React.memo(ValidationStepComponent);
