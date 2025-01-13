/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, renderHook } from '@testing-library/react';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { EuiBasicTable } from '@elastic/eui';
import { useKibana } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock/test_providers';
import {
  useSecurityDashboardsTableColumns,
  useSecurityDashboardsTableItems,
} from './use_security_dashboards_table';
import { METRIC_TYPE, TELEMETRY_EVENT } from '../../common/lib/telemetry/constants';
import * as telemetry from '../../common/lib/telemetry/track';
import { SecurityPageName } from '../../../common/constants';
import * as linkTo from '../../common/components/link_to';
import { getDashboardsByTagIds } from '../../common/containers/dashboards/api';
import { DEFAULT_DASHBOARDS_RESPONSE } from '../../common/containers/dashboards/__mocks__/api';
import { DashboardContextProvider } from '../context/dashboard_context';
import type { HttpStart } from '@kbn/core/public';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/containers/tags/api');
jest.mock('../../common/containers/dashboards/api');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const spyUseGetSecuritySolutionUrl = jest.spyOn(linkTo, 'useGetSecuritySolutionUrl');
const spyTrack = jest.spyOn(telemetry, 'track');
const {
  id: mockReturnDashboardId,
  attributes: { title: mockReturnDashboardTitle, description: mockReturnDashboardDescription },
} = DEFAULT_DASHBOARDS_RESPONSE[0];

const renderUseSecurityDashboardsTableItems = () => {
  return renderHook(useSecurityDashboardsTableItems, {
    wrapper: DashboardContextProvider,
  });
};

const renderUseDashboardsTableColumns = () =>
  renderHook(() => useSecurityDashboardsTableColumns(), {
    wrapper: TestProviders,
  });

const tagsColumn = {
  field: 'id', // set existing field to prevent test error
  name: 'Tags',
  'data-test-subj': 'dashboardTableTagsCell',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Security Dashboards Table hooks', () => {
  let mockTaggingGetTableColumnDefinition: jest.Mock;

  beforeEach(() => {
    useKibanaMock().services.dashboard = {
      locator: { getRedirectUrl: jest.fn(() => '/path') },
    } as unknown as DashboardStart;
    useKibanaMock().services.http = {} as unknown as HttpStart;

    mockTaggingGetTableColumnDefinition = useKibanaMock().services.savedObjectsTagging?.ui
      .getTableColumnDefinition as jest.Mock;

    mockTaggingGetTableColumnDefinition.mockReturnValue(tagsColumn);
  });

  describe('useSecurityDashboardsTableItems', () => {
    it('should request when renders', async () => {
      renderUseSecurityDashboardsTableItems();

      await waitFor(() => {
        expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
      });
    });

    it('should not request again when rerendered', async () => {
      const { rerender } = renderUseSecurityDashboardsTableItems();

      await waitFor(() => {
        expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
      });

      rerender();

      await waitFor(() => {
        return expect(getDashboardsByTagIds).toHaveBeenCalledTimes(1);
      });
    });

    it('should return a memoized value when rerendered', async () => {
      const { result, rerender } = renderUseSecurityDashboardsTableItems();

      waitFor(() => expect(result.current.isLoading).toBe(false));

      const result1 = result.current.items;

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result1).toBe(result.current.items);
      });
    });

    it('should return dashboard items', async () => {
      const { result } = renderUseSecurityDashboardsTableItems();

      const [dashboard1] = DEFAULT_DASHBOARDS_RESPONSE;

      await waitFor(() => {
        expect(result.current.items).toStrictEqual([
          {
            ...dashboard1,
            title: dashboard1.attributes.title,
            description: dashboard1.attributes.description,
          },
        ]);
      });
    });
  });

  describe('useDashboardsTableColumns', () => {
    it('should call getTableColumnDefinition to get tags column', async () => {
      renderUseDashboardsTableColumns();
      await waitFor(() => {
        expect(mockTaggingGetTableColumnDefinition).toHaveBeenCalled();
      });
    });

    it('should return dashboard columns', async () => {
      const { result } = renderUseDashboardsTableColumns();

      await waitFor(() => {
        expect(result.current).toEqual([
          expect.objectContaining({
            field: 'title',
            name: 'Title',
          }),
          expect.objectContaining({
            field: 'description',
            name: 'Description',
          }),
          expect.objectContaining(tagsColumn),
        ]);
      });
    });

    it('returns a memoized value', async () => {
      const { result, rerender } = renderUseDashboardsTableColumns();

      const result1 = result.current;

      rerender();

      const result2 = result.current;

      await waitFor(() => {
        expect(result1).toBe(result2);
      });
    });
  });

  it('should render a table with consistent items and columns', async () => {
    const { result: itemsResult } = renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    await waitFor(() => {
      expect(itemsResult.current.isLoading).toBe(false);
      expect(itemsResult.current.items).toHaveLength(1);
      expect(columnsResult.current).toHaveLength(3);
    });

    const result = render(
      <EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />,
      {
        wrapper: TestProviders,
      }
    );

    expect(await result.findAllByText('Title')).toHaveLength(1);
    expect(await result.findAllByText('Description')).toHaveLength(1);
    expect(await result.findAllByText('Tags')).toHaveLength(1);

    expect(await result.findByText(mockReturnDashboardTitle)).toBeInTheDocument();
    expect(await result.findByText(mockReturnDashboardDescription)).toBeInTheDocument();

    expect(await result.findAllByTestId('dashboardTableTitleCell')).toHaveLength(1);
    expect(await result.findAllByTestId('dashboardTableDescriptionCell')).toHaveLength(1);
    expect(await result.findAllByTestId('dashboardTableTagsCell')).toHaveLength(1);
  });

  it('should send telemetry when dashboard title clicked', async () => {
    const { result: itemsResult } = renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    await waitFor(() => {
      expect(itemsResult.current.isLoading).toBe(false);
      expect(itemsResult.current.items).toHaveLength(1);
      expect(columnsResult.current).toHaveLength(3);
    });

    const result = render(
      <EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />,
      {
        wrapper: TestProviders,
      }
    );

    result.getByText(mockReturnDashboardTitle).click();

    await waitFor(() => {
      expect(spyTrack).toHaveBeenCalledWith(METRIC_TYPE.CLICK, TELEMETRY_EVENT.DASHBOARD);
    });
  });

  it('should land on SecuritySolution dashboard view page when dashboard title clicked', async () => {
    const mockGetSecuritySolutionUrl = jest.fn();
    spyUseGetSecuritySolutionUrl.mockImplementation(() => mockGetSecuritySolutionUrl);
    const { result: itemsResult } = renderUseSecurityDashboardsTableItems();
    const { result: columnsResult } = renderUseDashboardsTableColumns();

    await waitFor(() => {
      expect(itemsResult.current.isLoading).toBe(false);
      expect(itemsResult.current.items).toHaveLength(1);
      expect(columnsResult.current).toHaveLength(3);
    });

    render(<EuiBasicTable items={itemsResult.current.items} columns={columnsResult.current} />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(mockGetSecuritySolutionUrl).toHaveBeenCalledWith({
        deepLinkId: SecurityPageName.dashboards,
        path: mockReturnDashboardId,
      });
    });
  });
});
