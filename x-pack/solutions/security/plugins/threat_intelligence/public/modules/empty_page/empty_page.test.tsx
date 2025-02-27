/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProvidersComponent } from '../../mocks/test_providers';
import { DOCS_LINK_TEST_ID, EmptyPage, INTEGRATION_LINK_ID } from './empty_page';
import { useTIDocumentationLink } from '../../hooks/use_documentation_link';
import { useIntegrationsPageLink } from '../../hooks/use_integrations_page_link';

jest.mock('../../hooks/use_integrations_page_link');
jest.mock('../../hooks/use_documentation_link');

const INTEGRATION_HREF = 'INTEGRATION_HREF';
const DOCUMENTATION_HREF = 'DOCUMENTATION_HREF';

describe('<EmptyPage />', () => {
  it('should render', () => {
    (
      useIntegrationsPageLink as jest.MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue(INTEGRATION_HREF);
    (useTIDocumentationLink as jest.MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      DOCUMENTATION_HREF
    );

    const { getByTestId } = render(
      <TestProvidersComponent>
        <EmptyPage />
      </TestProvidersComponent>
    );
    const integrationsPageLink = getByTestId(`${INTEGRATION_LINK_ID}`);

    expect(screen.getByText('Get started with Elastic Threat Intelligence')).toBeInTheDocument();

    expect(integrationsPageLink).toBeInTheDocument();
    expect(integrationsPageLink).toHaveAttribute('href', INTEGRATION_HREF);

    const documentationLink = getByTestId(`${DOCS_LINK_TEST_ID}`);

    expect(documentationLink).toBeInTheDocument();
    expect(documentationLink).toHaveAttribute('href', DOCUMENTATION_HREF);
  });
});
