/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NoVulnerabilitiesStates } from './no_vulnerabilities_states';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import { CNVM_NOT_INSTALLED_ACTION_SUBJ } from './test_subjects';
import { setupMockServer, startMockServer } from '../test/mock_server/mock_server';
import { renderWrapper } from '../test/mock_server/mock_server_test_provider';
import * as statusHandlers from '../../server/routes/status/status.handlers.mock';

const server = setupMockServer();

const renderNoVulnerabilitiesStates = (
  route = `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/vulnerabilities`
) =>
  renderWrapper(
    <MemoryRouter initialEntries={[route]}>
      <IntlProvider>
        <NoVulnerabilitiesStates />
      </IntlProvider>
    </MemoryRouter>
  );

describe('NoVulnerabilitiesStates - using mock server', () => {
  startMockServer(server);

  it('should show CNVM integration install prompt when vuln_mgmt is not-installed', async () => {
    server.use(statusHandlers.notInstalledHandler);

    renderNoVulnerabilitiesStates();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Elastic’s Cloud Native Vulnerability Management/i)
      ).toBeInTheDocument();
    });

    const cnvmButton = screen.getByTestId(CNVM_NOT_INSTALLED_ACTION_SUBJ);
    expect(cnvmButton).toBeInTheDocument();
    expect(cnvmButton).toHaveAttribute('href', expect.stringContaining('cloud_security_posture'));
  });

  it('should show third-party integration options when clicking popover button', async () => {
    server.use(statusHandlers.notInstalledHandler);

    renderNoVulnerabilitiesStates();

    const addIntegrationButton = await waitFor(() =>
      screen.getByTestId('thirdPartyVulnerabilityIntegrationPopoverButton')
    );

    await userEvent.click(addIntegrationButton);

    await waitFor(() => {
      expect(screen.getByTestId('integrationOption-wiz')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/wiz/add-integration'
      );
      expect(screen.getByTestId('integrationOption-qualys')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/qualys_vmdr/add-integration'
      );
      expect(screen.getByTestId('integrationOption-tenable')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/tenable_io/add-integration'
      );
      expect(screen.getByTestId('integrationOption-rapid7')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/rapid7_insightvm/add-integration'
      );
      expect(screen.getByTestId('integrationOption-google_scc')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/google_scc/add-integration'
      );
      expect(screen.getByTestId('integrationOption-microsoft_365_defender')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/m365_defender/add-integration'
      );
      expect(screen.getByTestId('integrationOption-aws_security_hub')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/aws/add-integration/securityhub'
      );
      expect(screen.getByTestId('integrationOption-aws_inspector')).toHaveAttribute(
        'href',
        '/app/fleet/integrations/aws/add-integration/inspector'
      );
    });
  });
});
