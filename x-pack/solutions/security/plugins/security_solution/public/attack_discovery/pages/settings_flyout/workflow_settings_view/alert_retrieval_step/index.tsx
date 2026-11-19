/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { AlertRetrievalContent, type AlertRetrievalContentProps } from './alert_retrieval_content';
import * as workflowI18n from '../../workflow_configuration/translations';

export type AlertRetrievalStepProps = AlertRetrievalContentProps;

const AlertRetrievalStepComponent: React.FC<AlertRetrievalStepProps> = (props) => (
  <>
    <EuiText color="subdued" size="s">
      {workflowI18n.ALERT_RETRIEVAL_SECTION_DESCRIPTION}
    </EuiText>

    <EuiSpacer size="m" />

    <AlertRetrievalContent {...props} />
  </>
);

AlertRetrievalStepComponent.displayName = 'AlertRetrievalStep';

export const AlertRetrievalStep = React.memo(AlertRetrievalStepComponent);
