/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '@kbn/security-solution-plugin/public';
import type { StartServices } from '../../types';

interface LandingPageWrapperProps {
  services: StartServices;
}

export const AiForSocLandingPage: React.FC<LandingPageWrapperProps> = ({ services }) => {
  return (
    <SecuritySolutionPageWrapper>
      <EuiPageTemplate>
        <EuiPageTemplate.Section>
          <EuiTitle size="l">
            <h1>Welcome to AI for SOC</h1>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiText>
            <p>AI for SOC provides intelligent capabilities to enhance your security operations:</p>
            <ul>
              <li>AI-powered alert analysis and triage</li>
              <li>Automated threat detection assistance</li>
              <li>Intelligent incident response recommendations</li>
            </ul>
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </SecuritySolutionPageWrapper>
  );
};
