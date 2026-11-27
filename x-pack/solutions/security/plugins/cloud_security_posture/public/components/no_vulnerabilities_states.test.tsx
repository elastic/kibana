/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { OnboardingStatus } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { NoVulnerabilitiesStates } from './no_vulnerabilities_states';
import * as useCspSetupStatusApi from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import * as useCspIntegrationLink from '../common/navigation/use_csp_integration_link';
import * as useAddIntegrationRoute from '../common/api/use_add_integrations_route';
import {
  CNVM_NOT_INSTALLED_ACTION_SUBJ,
  NATIVE_VULN_SCANNER_EMPTY_STATE_SUBJECTS,
  THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_INTEGRATION_BUTTON,
} from './test_subjects';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import { useKibana } from '../common/hooks/use_kibana';
import { SCANNER_SETTINGS_PATH } from '../common/navigation/constants';
import { setupMockServer, startMockServer } from '../test/mock_server/mock_server';

jest.mock('@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api');
jest.mock('../common/navigation/use_csp_integration_link');
jest.mock('../common/api/use_wiz_integration_route');
jest.mock('../common/api/use_add_integrations_route');
jest.mock('../common/hooks/use_kibana');

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

  const getUrlForApp = jest.fn(
    (appId: string, { path }: { path: string }) => `/app/${appId}#${path}`
  );
  const httpGet = jest.fn();

  const renderStates = () =>
    render(
      <MemoryRouter initialEntries={[vulnerabilitiesPath]}>
        <IntlProvider>
          <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
          >
            <NoVulnerabilitiesStates />
          </QueryClientProvider>
        </IntlProvider>
      </MemoryRouter>
    );

  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpGet.mockReset();
    httpGet.mockRejectedValue({ response: { status: 404 } });
    (useKibana as jest.Mock).mockReturnValue({
      services: { application: { getUrlForApp }, http: { get: httpGet } },
    });
    (useCspSetupStatusApi.useCspSetupStatusApi as jest.Mock).mockReturnValue({
      data: {
        vuln_mgmt: { status: 'not-installed' },
        indicesDetails: [],
      },
    });

    renderStates();
  });

  afterEach(() => {
    consoleError.mockRestore();
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

  it('does not show the native scanner option and logs nothing when the status route is 404', async () => {
    await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId(CNVM_NOT_INSTALLED_ACTION_SUBJ)).toBeInTheDocument()
    );

    expect(
      screen.queryByTestId(NATIVE_VULN_SCANNER_EMPTY_STATE_SUBJECTS.PROMPT)
    ).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('shows a link to the scanner settings page when the status route answers 200', async () => {
    cleanup();
    httpGet.mockReset();
    const statusBody: Pick<OnboardingStatus, 'license' | 'policies'> = {
      license: 'ok',
      policies: [],
    };
    httpGet.mockResolvedValue(statusBody);
    renderStates();

    const button = await screen.findByTestId(NATIVE_VULN_SCANNER_EMPTY_STATE_SUBJECTS.BUTTON);
    expect(button).toHaveAttribute('href', expect.stringContaining(SCANNER_SETTINGS_PATH));
    expect(button).toHaveTextContent('Scan hosts with Elastic Agent');
  });
});
