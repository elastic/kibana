/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AzureSetupInfoContent } from './azure_setup_info';

// Mock the cloud setup hook
jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: jest.fn(() => ({
    shortName: 'CSPM',
  })),
}));

describe('AzureSetupInfoContent', () => {
  const mockDocumentationLink =
    'https://www.elastic.co/guide/en/security/current/cspm-get-started.html';

  const renderComponent = (documentationLink: string) =>
    render(
      <I18nProvider>
        <AzureSetupInfoContent documentationLink={documentationLink} />
      </I18nProvider>
    );

  it('should render setup info content correctly', () => {
    renderComponent(mockDocumentationLink);

    // Check title
    expect(screen.getByRole('heading', { name: /setup access/i })).toBeInTheDocument();

    // Check that description text contains key information
    expect(screen.getByText(/Utilize an Azure Resource Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/deploy CSPM for assessing/i)).toBeInTheDocument();

    // Check getting started link
    expect(screen.getByRole('link', { name: /getting started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /getting started/i })).toHaveAttribute(
      'href',
      mockDocumentationLink
    );
    expect(screen.getByRole('link', { name: /getting started/i })).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  it('should use shortName from cloud setup context', () => {
    renderComponent(mockDocumentationLink);

    // Verify that the shortName "CSPM" appears in the text
    expect(screen.getByText(/deploy CSPM for assessing/i)).toBeInTheDocument();
  });

  it('should render with custom documentation link', () => {
    const customLink = 'https://example.com/custom-docs';
    renderComponent(customLink);

    expect(screen.getByRole('link', { name: /getting started/i })).toHaveAttribute(
      'href',
      customLink
    );
  });
});
