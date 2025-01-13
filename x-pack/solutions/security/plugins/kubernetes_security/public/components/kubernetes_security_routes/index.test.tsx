/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { MemoryRouterProps } from 'react-router';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KubernetesSecurityRoutes } from '.';
import { createAppRootMockRenderer } from '../../test';

jest.mock('../percent_widget', () => ({
  PercentWidget: () => <div>{'Mock percent widget'}</div>,
}));

jest.mock('../../hooks/use_last_updated', () => ({
  useLastUpdated: () => <div>{'Mock updated now'}</div>,
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
  const useGlobalFullScreen = jest.fn();
  useGlobalFullScreen.mockImplementation(() => {
    return { globalFullScreen: false };
  });
  const useSourcererDataView = jest.fn();
  useSourcererDataView.mockImplementation(() => {
    return {
      indexPattern: {
        fields: [
          {
            aggregatable: false,
            esTypes: [],
            name: '_id',
            searchable: true,
            type: 'string',
          },
        ],
        title: '.mock-index-pattern',
      },
    };
  });
  const mockedContext = createAppRootMockRenderer();
  return mockedContext.render(
    <MemoryRouter initialEntries={initialEntries}>
      <KubernetesSecurityRoutes
        filter={<div>{'Mock filters'}</div>}
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
};

describe('Kubernetes security routes', () => {
  it('navigates to the kubernetes page', () => {
    renderWithRouter();
    expect(screen.getAllByText('Mock count widget')).toHaveLength(5);
    expect(screen.getAllByText('Mock percent widget')).toHaveLength(2);
    expect(screen.getAllByText('Mock updated now')).toHaveLength(1);
  });
});
