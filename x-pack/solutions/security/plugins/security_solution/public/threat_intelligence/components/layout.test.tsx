/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { DefaultPageLayout } from './layout';
import '@testing-library/jest-dom';
import { TestProvidersComponent } from '../mocks/test_providers';

describe('<DefaultPageLayout />', () => {
  it('renders the page title in the app header', () => {
    render(<DefaultPageLayout pageTitle="Stranger Threats" />, {
      wrapper: TestProvidersComponent,
    });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Stranger Threats'
    );
  });

  it('does not render a back button', () => {
    render(<DefaultPageLayout pageTitle="Stranger Threats" />, {
      wrapper: TestProvidersComponent,
    });

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('renders a documentation item that points to the indicators documentation', async () => {
    render(<DefaultPageLayout pageTitle="Stranger Threats" />, {
      wrapper: TestProvidersComponent,
    });

    await openAppMenuOverflow();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/solutions/security/investigate/indicators-of-compromise'
    );
  });

  it('renders children', () => {
    render(
      <DefaultPageLayout pageTitle="Stranger Threats">
        <div data-test-subj="content" />
      </DefaultPageLayout>,
      { wrapper: TestProvidersComponent }
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
