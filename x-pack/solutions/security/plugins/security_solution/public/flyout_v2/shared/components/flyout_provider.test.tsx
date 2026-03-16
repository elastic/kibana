/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useLocation } from 'react-router-dom';
import { createStore } from 'redux';
import type { StartServices } from '../../../types';
import { flyoutProviders } from './flyout_provider';

const services = {
  uiActions: {
    getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
  },
} as unknown as StartServices;

const LocationProbe = () => {
  const { pathname, search } = useLocation();

  return <div>{`${pathname}${search}`}</div>;
};

const ExpandableFlyoutApiProbe = () => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  return <div>{typeof openPreviewPanel}</div>;
};

describe('flyoutProviders', () => {
  it('uses the provided history when available', () => {
    const history = createMemoryHistory({ initialEntries: ['/security?foo=bar'] });
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        history,
        children: <LocationProbe />,
      })
    );

    expect(screen.getByText('/security?foo=bar')).toBeInTheDocument();
  });

  it('renders children without a router when no history is provided', () => {
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        children: <div>{'NoRouterFallback'}</div>,
      })
    );

    expect(screen.getByText('NoRouterFallback')).toBeInTheDocument();
  });

  it('provides expandable flyout context to children', () => {
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        children: <ExpandableFlyoutApiProbe />,
      })
    );

    expect(screen.getByText('function')).toBeInTheDocument();
  });
});
