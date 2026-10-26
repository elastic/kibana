/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface AWSSetupInfoContentProps {
  info: ReactNode;
}

export const AWSSetupInfoContent = ({ info }: AWSSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        {info}
      </EuiText>
    </>
  );
};
