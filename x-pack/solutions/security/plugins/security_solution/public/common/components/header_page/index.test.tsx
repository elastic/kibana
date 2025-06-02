/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { screen, render } from '@testing-library/react';

import { TestProviders } from '../../mock';
import { HeaderPage } from '.';
import { SecurityPageName } from '../../../app/types';

jest.mock('../../lib/kibana');
jest.mock('../link_to');

describe('HeaderPage', () => {
  test('it renders', () => {
    render(
      <TestProviders>
        <HeaderPage
          badgeOptions={{ beta: true, text: 'Beta', tooltip: 'Test tooltip' }}
          border
          subtitle="Test subtitle"
          subtitle2="Test subtitle 2"
          title="Test title"
        >
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(screen.getByTestId('header-page')).toMatchSnapshot();
  });

  test('it renders the back link when provided', () => {
    const wrapper = render(
      <TestProviders>
        <HeaderPage
          backOptions={{ path: '#', text: 'Test link', pageId: SecurityPageName.hosts }}
          title="Test title"
        />
      </TestProviders>
    );

    expect(
      wrapper.container.querySelector('.securitySolutionHeaderPage__linkBack')
    ).toBeInTheDocument();
  });

  test('it DOES NOT render the back link when not provided', () => {
    const { container } = render(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(container.querySelector('.securitySolutionHeaderPage__linkBack')).toBeNull();
  });

  test('it renders the first subtitle when provided', () => {
    render(
      <TestProviders>
        <HeaderPage subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(screen.getByTestId('header-page-subtitle')).toBeInTheDocument();
  });

  test('it DOES NOT render the first subtitle when not provided', () => {
    render(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(screen.queryByTestId('header-section-subtitle')).not.toBeInTheDocument();
  });

  test('it renders the second subtitle when provided', () => {
    render(
      <TestProviders>
        <HeaderPage subtitle2="Test subtitle 2" title="Test title" />
      </TestProviders>
    );

    expect(screen.getByTestId('header-page-subtitle-2')).toBeInTheDocument();
  });

  test('it DOES NOT render the second subtitle when not provided', () => {
    render(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(screen.queryByTestId('header-section-subtitle-2')).not.toBeInTheDocument();
  });

  test('it renders supplements when children provided', () => {
    render(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(screen.getByTestId('header-page-supplements')).toBeInTheDocument();
  });

  test('it DOES NOT render supplements when children not provided', () => {
    render(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(screen.queryByTestId('header-page-supplements')).not.toBeInTheDocument();
  });

  test('it renders the right side items', () => {
    render(
      <TestProviders>
        <HeaderPage
          title="Test title"
          rightSideItems={[
            <div key="test" data-test-subj="right-side-item">
              {'Right side item'}
            </div>,
          ]}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('right-side-item')).toBeInTheDocument();
  });
});
