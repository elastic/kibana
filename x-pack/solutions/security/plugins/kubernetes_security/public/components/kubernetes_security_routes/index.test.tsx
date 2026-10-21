/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import type { MemoryRouterProps } from 'react-router';
import { act, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KubernetesSecurityRoutes } from '.';
import { createAppRootMockRenderer } from '../../test';
import type { KubernetesPageHeaderProps } from '../../types';
import { CHART_TOGGLE_HIDE, CHART_TOGGLE_SHOW } from '../../../common/translations';
import { TOGGLE_TEST_ID } from '../charts_toggle';

jest.mock('../percent_widget', () => ({
  PercentWidget: () => <div>{'Mock percent widget'}</div>,
}));

jest.mock('../../hooks/use_last_updated_text', () => ({
  useLastUpdatedText: () => 'Mock updated now',
}));

jest.mock('../count_widget', () => ({
  CountWidget: () => <div>{'Mock count widget'}</div>,
}));

jest.mock('../container_name_widget', () => ({
  ContainerNameWidget: () => <div>{'Mock Container Name widget'}</div>,
}));

const dataViewId = 'dataViewId';

const renderWithRouter = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/kubernetes']
) => {
  const renderHeader = jest.fn((_headerProps: KubernetesPageHeaderProps) => (
    <div>{'Mock header'}</div>
  ));
  const mockedContext = createAppRootMockRenderer();
  const renderResult = mockedContext.render(
    <MemoryRouter initialEntries={initialEntries}>
      <KubernetesSecurityRoutes
        filter={<div>{'Mock filters'}</div>}
        renderHeader={renderHeader}
        globalFilter={{
          filterQuery: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}',
          startDate: '2022-03-08T18:52:15.532Z',
          endDate: '2022-06-09T17:52:15.532Z',
        }}
        renderSessionsView={jest.fn()}
        dataViewId={dataViewId}
      />
    </MemoryRouter>
  );

  const getLastHeaderProps = (): KubernetesPageHeaderProps => renderHeader.mock.lastCall![0];
  const getChartsToggleItem = () =>
    getLastHeaderProps().menu.items?.find((item) => item.testId === TOGGLE_TEST_ID);

  return { ...renderResult, getLastHeaderProps, getChartsToggleItem };
};

describe('Kubernetes security routes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('navigates to the kubernetes page', () => {
    renderWithRouter();
    expect(screen.getByText('Mock header')).toBeInTheDocument();
    expect(screen.getByText('Mock filters')).toBeInTheDocument();
    expect(screen.getAllByText('Mock count widget')).toHaveLength(5);
    expect(screen.getAllByText('Mock percent widget')).toHaveLength(2);
  });

  it('passes the last updated time to the header as its description', () => {
    const { getLastHeaderProps } = renderWithRouter();

    expect(getLastHeaderProps().description).toBe('Mock updated now');
  });

  it('passes a "Hide charts" item to the header menu', () => {
    const { getChartsToggleItem } = renderWithRouter();

    expect(getChartsToggleItem()?.label).toBe(CHART_TOGGLE_HIDE);
  });

  it('hides the charts when the header menu toggle runs', () => {
    const { getChartsToggleItem } = renderWithRouter();

    act(() => {
      getChartsToggleItem()?.run?.();
    });

    expect(screen.queryByText('Mock count widget')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock percent widget')).not.toBeInTheDocument();
    expect(getChartsToggleItem()?.label).toBe(CHART_TOGGLE_SHOW);
  });
});
