/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';

import { TestProviders, createMockStore } from '../../../../common/mock';
import { hostsModel } from '../../store';
import { HostsTableType } from '../../store/model';
import { HostsTable } from '.';
import { mockData } from './mock';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/lib/kibana/hooks', () => ({
  useNavigateTo: () => ({
    navigateTo: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

jest.mock('../../../../common/components/link_to');

const mockUseMlCapabilities = jest.fn().mockReturnValue({ isPlatinumOrTrialLicense: true });

jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities', () => ({
  useMlCapabilities: () => mockUseMlCapabilities(),
}));

const mockUseHasSecurityCapability = jest.fn().mockReturnValue(false);
jest.mock('../../../../helper_hooks', () => ({
  useHasSecurityCapability: () => mockUseHasSecurityCapability(),
}));

const mockUseUiSetting = jest.fn().mockReturnValue([false]);

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useUiSetting$: () => mockUseUiSetting(),
  };
});

describe('Hosts Table', () => {
  const loadPage = jest.fn();
  const store = createMockStore();

  describe('rendering', () => {
    test('it renders the default Hosts table', () => {
      render(
        <TestProviders store={store}>
          <HostsTable
            data={mockData}
            id="hostsQuery"
            isInspect={false}
            fakeTotalCount={0}
            loading={false}
            loadPage={loadPage}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            totalCount={-1}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('table-allHosts-loading-false')).toBeInTheDocument();
    });

    test('it renders "Host Risk level" column when "isPlatinumOrTrialLicense" is truthy and user has risk-entity capability', () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });
      mockUseHasSecurityCapability.mockReturnValue(true);

      render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('tableHeaderCell_node.risk_4')).toBeInTheDocument();
    });

    test("it doesn't render 'Host Risk level' column when 'isPlatinumOrTrialLicense' is falsy", () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: false });
      mockUseHasSecurityCapability.mockReturnValue(true);

      render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('tableHeaderCell_node.riskScore_4')).not.toBeInTheDocument();
    });

    test("it doesn't render 'Host Risk level' column when user doesn't has entity-analytics capabilities", () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });
      mockUseHasSecurityCapability.mockReturnValue(false);

      render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('tableHeaderCell_node.riskScore_4')).not.toBeInTheDocument();
    });

    test('it renders "Asset Criticality" column when "isPlatinumOrTrialLicense" is truthy, user has risk-entity capability and Asset Criticality is enabled in Kibana settings', () => {
      mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });
      mockUseHasSecurityCapability.mockReturnValue(true);
      mockUseUiSetting.mockReturnValue([true]);

      render(
        <TestProviders store={store}>
          <HostsTable
            id="hostsQuery"
            isInspect={false}
            loading={false}
            data={mockData}
            totalCount={0}
            fakeTotalCount={-1}
            setQuerySkip={jest.fn()}
            showMorePagesIndicator={false}
            loadPage={loadPage}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('tableHeaderCell_node.criticality_5')).toBeInTheDocument();
    });

    describe('Sorting on Table', () => {
      test('Initial value of the store', async () => {
        const { container } = render(
          <TestProviders store={store}>
            <HostsTable
              id="hostsQuery"
              isInspect={false}
              loading={false}
              data={mockData}
              totalCount={0}
              fakeTotalCount={-1}
              setQuerySkip={jest.fn()}
              showMorePagesIndicator={false}
              loadPage={loadPage}
              type={hostsModel.HostsType.page}
            />
          </TestProviders>
        );

        expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
          activePage: 0,
          direction: 'desc',
          sortField: 'lastSeen',
          limit: 10,
        });

        const lastSeenHeader = Array.from(
          container.querySelectorAll('.euiTable thead tr th button')
        ).at(-1);
        expect(lastSeenHeader).toHaveTextContent('Last seen');
      });

      test('when you click on the column header, you should show the sorting icon', async () => {
        const { container } = render(
          <TestProviders store={store}>
            <HostsTable
              id="hostsQuery"
              isInspect={false}
              loading={false}
              data={mockData}
              totalCount={0}
              fakeTotalCount={-1}
              setQuerySkip={jest.fn()}
              showMorePagesIndicator={false}
              loadPage={loadPage}
              type={hostsModel.HostsType.page}
            />
          </TestProviders>
        );

        const hostNameHeader = container.querySelector('.euiTable thead tr th:first-child button');
        if (hostNameHeader) {
          fireEvent.click(hostNameHeader);
        }

        await waitFor(() => {
          expect(store.getState().hosts.page.queries[HostsTableType.hosts]).toEqual({
            activePage: 0,
            direction: 'asc',
            sortField: 'hostName',
            limit: 10,
          });
          expect(hostNameHeader).toHaveTextContent('Host name');
        });
      });
    });
  });
});
