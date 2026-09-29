/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import type { MemoryRouterProps } from 'react-router';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KubernetesSecurityRoutes } from '.';
import { createAppRootMockRenderer } from '../../test';

vi.mock('../percent_widget', () => {
      const mocked = {
      PercentWidget: () => <div>{'Mock percent widget'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_last_updated', () => {
      const mocked = {
      useLastUpdated: () => <div>{'Mock updated now'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../count_widget', () => {
      const mocked = {
      CountWidget: () => <div>{'Mock count widget'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../container_name_widget', () => {
      const mocked = {
      ContainerNameWidget: () => <div>{'Mock Container Name widget'}</div>,
    };
      return { ...mocked, default: mocked };
    });

const dataViewId = 'dataViewId';

const renderWithRouter = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/kubernetes']
) => {
  const useGlobalFullScreen = vi.fn();
  useGlobalFullScreen.mockImplementation(() => {
    return { globalFullScreen: false };
  });
  const useSourcererDataView = vi.fn();
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
        renderSessionsView={vi.fn()}
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
