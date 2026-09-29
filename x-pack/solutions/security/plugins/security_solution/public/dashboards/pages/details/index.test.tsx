/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { DashboardView } from '.';
import { useCapabilities } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';

vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ detailName: 'mockSavedObjectId' }),
  };
});

vi.mock('../../../common/lib/kibana', async () => {
  const actual = await vi.importActual('../../../common/lib/kibana');
  return {
    ...actual,
    useCapabilities: vi.fn().mockReturnValue({ show: true, showWriteControls: true }),
  };
});

vi.mock('../../components/dashboard_renderer', () => {
  const mocked = {
    DashboardRenderer: vi
      .fn()
      .mockImplementation((props) => (
        <div data-test-subj={`dashboard-view-${props.savedObjectId}`} />
      )),
  };
  return { ...mocked, default: mocked };
});

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  block: vi.fn(),
  createHref: vi.fn(),
  listen: vi.fn(),
};

describe('DashboardView', () => {
  beforeEach(() => {
    (useCapabilities as unknown as Mock).mockReturnValue({
      show: true,
      showWriteControls: true,
    });
  });
  test('render when no error state', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).toBeInTheDocument();
  });

  test('render a prompt when error state exists', () => {
    (useCapabilities as unknown as Mock).mockReturnValue({
      show: false,
      showWriteControls: true,
    });
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).not.toBeInTheDocument();
    expect(queryByTestId(`dashboard-view-error-prompt-wrapper`)).toBeInTheDocument();
  });

  test('render dashboard view with height', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-wrapper`)).toHaveStyle({
      'min-height': `calc(100vh - 140px)`,
    });
  });
});
