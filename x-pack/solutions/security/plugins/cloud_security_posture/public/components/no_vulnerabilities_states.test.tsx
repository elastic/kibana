/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { NoVulnerabilitiesStates } from './no_vulnerabilities_states';
import * as useCspSetupStatusApi from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import * as useCspIntegrationLink from '../common/navigation/use_csp_integration_link';
import * as useAddIntegrationRoute from '../common/api/use_add_integrations_route';
import {
  CNVM_NOT_INSTALLED_ACTION_SUBJ,
  THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_INTEGRATION_BUTTON,
} from './test_subjects';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import { setupMockServer, startMockServer } from '../test/mock_server/mock_server';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api');
jest.mock('../common/navigation/use_csp_integration_link');
jest.mock('../common/api/use_wiz_integration_route');
jest.mock('../common/api/use_add_integrations_route');

const server = setupMockServer();

describe('NoVulnerabilitiesStates', () => {
  const cnvmintegrationLink = 'fleet/integrations/cloud_security_posture/add-integration';
  const integrationRouteLink = 'app/integrations/browse/security/vulnerability_workflow';
  const vulnerabilitiesPath = `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/vulnerabilities`;

  startMockServer(server);

  beforeAll(() => {
    (useCspIntegrationLink.useCspIntegrationLink as jest.Mock).mockReturnValue(cnvmintegrationLink);
    (useAddIntegrationRoute.useAddIntegrationRoute as jest.Mock).mockReturnValue(
      integrationRouteLink
    );
  });

  beforeEach(() => {
    (useCspSetupStatusApi.useCspSetupStatusApi as jest.Mock).mockReturnValue({
      data: {
        vuln_mgmt: { status: 'not-installed' },
        indicesDetails: [],
      },
    });

    render(
      <MemoryRouter initialEntries={[vulnerabilitiesPath]}>
        <IntlProvider>
          <NoVulnerabilitiesStates />
        </IntlProvider>
      </MemoryRouter>
    );
  });

  it('Vulnerabilities - `Add CNVM integration`: should have link element to CNVM integration installation page', async () => {
    await waitFor(() =>
      expect(
        screen.getByText(/Elastic’s Cloud Native\s+Vulnerability Management/i)
      ).toBeInTheDocument()
    );

    // Find the button
    const button = screen.getByTestId(CNVM_NOT_INSTALLED_ACTION_SUBJ);
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', expect.stringContaining(cnvmintegrationLink));
  });

  it('Vulnerabilities - `Add integration`: should have link element to integration page', async () => {
    await waitFor(() =>
      expect(
        screen.getByText(/Already using a vulnerability management solution\?/i)
      ).toBeInTheDocument()
    );

    // Find the button
    const button = screen.getByTestId(
      THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_INTEGRATION_BUTTON
    );
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', expect.stringContaining(integrationRouteLink));
  });
});
