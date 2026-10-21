/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { coreMock } from '@kbn/core/public/mocks';
import { Router } from '@kbn/shared-ux-router';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import { TestProvider } from '../../test/test_provider';
import { Findings } from './findings';

jest.mock('../configurations', () => ({
  Configurations: () => <div data-test-subj="configurations" />,
}));

jest.mock('../vulnerabilities', () => ({
  Vulnerabilities: () => <div data-test-subj="vulnerabilities" />,
}));

const { docLinks } = coreMock.createStart();

const renderFindings = (pathname: string) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });

  render(
    <TestProvider>
      <Router history={history}>
        <Findings />
      </Router>
    </TestProvider>
  );
};

describe('<Findings />', () => {
  it('links to the Cloud Security Posture Management documentation on the misconfigurations tab', async () => {
    renderFindings(findingsNavigation.findings_default.path);

    await openAppMenuOverflow();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      docLinks.links.securitySolution.cloudSecurityPosture
    );
  });

  it('links to the Cloud Native Vulnerability Management documentation on the vulnerabilities tab', async () => {
    renderFindings(findingsNavigation.vulnerabilities.path);

    await openAppMenuOverflow();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      docLinks.links.securitySolution.cloudNativeVulnerabilityManagement
    );
  });
});
