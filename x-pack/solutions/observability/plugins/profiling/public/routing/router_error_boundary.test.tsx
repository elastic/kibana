/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { NotFoundRouteException } from '@kbn/typed-react-router-config';
import { RouterErrorBoundary } from './router_error_boundary';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn().mockReturnValue({
    services: {
      observabilityShared: {
        navigation: {
          PageTemplate: ({ children }: { children: React.ReactNode }) => (
            <div data-test-subj="page-template">{children}</div>
          ),
        },
      },
    },
  }),
}));

jest.mock('@kbn/shared-ux-prompt-not-found', () => ({
  ...jest.requireActual('@kbn/shared-ux-prompt-not-found'),
  NotFoundPrompt: () => <div data-test-subj="not-found-prompt">Not Found</div>,
}));

jest.mock('@kbn/shared-ux-error-boundary', () => {
  const ActualReact = jest.requireActual('react') as typeof import('react');

  class KibanaErrorBoundaryMock extends ActualReact.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    render() {
      if (this.state.hasError) {
        return ActualReact.createElement(
          'div',
          { 'data-test-subj': 'kibana-error-boundary' },
          'Error caught by KibanaErrorBoundary'
        );
      }
      return this.props.children;
    }
  }

  return {
    ...jest.requireActual('@kbn/shared-ux-error-boundary'),
    KibanaErrorBoundary: KibanaErrorBoundaryMock,
  };
});

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

function ThrowError({ error }: { error: Error }): React.ReactElement {
  throw error;
}

describe('RouterErrorBoundary', () => {
  beforeEach(() => {
    mockUseLocation.mockReturnValue({
      pathname: '/profiling',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error is thrown', () => {
    render(
      <RouterErrorBoundary>
        <div data-test-subj="child">Hello</div>
      </RouterErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders NotFoundPrompt when a NotFoundRouteException is thrown', () => {
    render(
      <RouterErrorBoundary>
        <ThrowError error={new NotFoundRouteException('Route not found')} />
      </RouterErrorBoundary>
    );

    expect(screen.getByTestId('not-found-prompt')).toBeInTheDocument();
    expect(screen.queryByTestId('kibana-error-boundary')).not.toBeInTheDocument();
  });

  it('rethrows non-NotFoundRouteException errors into KibanaErrorBoundary', () => {
    render(
      <RouterErrorBoundary>
        <ThrowError error={new Error('Something went wrong')} />
      </RouterErrorBoundary>
    );

    expect(screen.getByTestId('kibana-error-boundary')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found-prompt')).not.toBeInTheDocument();
  });

  it('resets error state and renders children when resetKey changes', () => {
    const { rerender } = render(
      <RouterErrorBoundary>
        <ThrowError error={new NotFoundRouteException('Route not found')} />
      </RouterErrorBoundary>
    );

    expect(screen.getByTestId('not-found-prompt')).toBeInTheDocument();

    mockUseLocation.mockReturnValue({
      pathname: '/profiling/flamegraph',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    });

    rerender(
      <RouterErrorBoundary>
        <div data-test-subj="child">Hello</div>
      </RouterErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found-prompt')).not.toBeInTheDocument();
  });
});
