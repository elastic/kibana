/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { CliInstallModal } from './cli_install_modal';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import {
  CLI_INSTALL_COMMAND,
  CLI_VERIFY_COMMAND,
  CLI_REPO_URL,
  CLI_COMMAND_REFERENCE_URL,
} from './constants';

jest.mock('../../hooks/use_elasticsearch_url');

const mockUseElasticsearchUrl = useElasticsearchUrl as jest.Mock;

const MOCK_ES_URL = 'https://my-deployment.es.us-east-1.aws.elastic.cloud:443';

const renderComponent = (onClose = jest.fn()) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <CliInstallModal onClose={onClose} />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('CliInstallModal', () => {
  beforeEach(() => {
    mockUseElasticsearchUrl.mockReturnValue(MOCK_ES_URL);
  });

  it('renders the install, connect, and verify commands', () => {
    renderComponent();

    expect(screen.getByTestId('cliInstallModalInstallCode')).toHaveTextContent(CLI_INSTALL_COMMAND);
    expect(screen.getByTestId('cliInstallModalConnectCode')).toHaveTextContent(MOCK_ES_URL);
    expect(screen.getByTestId('cliInstallModalVerifyCode')).toHaveTextContent(CLI_VERIFY_COMMAND);
  });

  it('links to the CLI repo and command reference', () => {
    renderComponent();

    expect(screen.getByTestId('cliInstallModalRepoLink')).toHaveAttribute('href', CLI_REPO_URL);
    expect(screen.getByTestId('cliInstallModalCommandReferenceLink')).toHaveAttribute(
      'href',
      CLI_COMMAND_REFERENCE_URL
    );
  });

  it('calls onClose when the Close button is clicked', () => {
    const onClose = jest.fn();
    renderComponent(onClose);

    fireEvent.click(screen.getByTestId('cliInstallModalCloseBtn'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
