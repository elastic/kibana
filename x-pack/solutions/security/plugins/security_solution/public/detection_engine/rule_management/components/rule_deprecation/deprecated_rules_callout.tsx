/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';

interface DeprecatedRulesCalloutProps {
  title: string;
  description: string;
  buttonLabel: string;
  onButtonClick: () => void;
  isButtonDisabled?: boolean;
  dataTestSubj?: string;
}

export const DeprecatedRulesCallout: React.FC<DeprecatedRulesCalloutProps> = ({
  title,
  description,
  buttonLabel,
  onButtonClick,
  isButtonDisabled = false,
  dataTestSubj,
}) => {
  return (
    <>
      <EuiCallOut title={title} color="warning" iconType="warning" data-test-subj={dataTestSubj}>
        <p>{description}</p>
        <EuiButton
          color="warning"
          onClick={onButtonClick}
          disabled={isButtonDisabled}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {buttonLabel}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
