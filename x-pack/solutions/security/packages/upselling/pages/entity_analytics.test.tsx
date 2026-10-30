/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { EntityAnalyticsUpsellingPage } from './entity_analytics';
import { ENTITY_ANALYTICS_TITLE } from './translations';

jest.mock('@kbn/security-solution-navigation', () => {
  const original = jest.requireActual('@kbn/security-solution-navigation');
  return {
    ...original,
    useNavigation: () => ({
      navigateTo: jest.fn(),
    }),
  };
});

const renderPage = (props: Partial<React.ComponentProps<typeof EntityAnalyticsUpsellingPage>>) =>
  render(
    <MockAppHeaderProvider>
      <EntityAnalyticsUpsellingPage
        upgradeMessage="test upgrade message"
        upgradeToLabel="TEST LICENSE"
        {...props}
      />
    </MockAppHeaderProvider>
  );

describe('EntityAnalyticsUpselling', () => {
  it('should render', () => {
    renderPage({});
    expect(screen.getByTestId('paywallCardDescription')).toBeInTheDocument();
  });

  it('should render the page title in the app header', () => {
    renderPage({});
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      ENTITY_ANALYTICS_TITLE
    );
  });

  it('should render the documentation link in the app header menu', async () => {
    const docLink = 'https://www.elastic.co/docs/entity-risk-scoring';
    renderPage({ docLink });

    await openAppMenuOverflow();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      docLink
    );
  });

  it('should show upgrade label badge', () => {
    renderPage({ upgradeToLabel: 'TEST PRODUCT' });

    expect(screen.getByText('TEST PRODUCT')).toBeInTheDocument();
  });

  it('should show license message', () => {
    renderPage({ upgradeToLabel: 'TEST PRODUCT' });

    expect(screen.getByTestId('paywallCardDescription')).toHaveTextContent('test upgrade message');
  });
});
