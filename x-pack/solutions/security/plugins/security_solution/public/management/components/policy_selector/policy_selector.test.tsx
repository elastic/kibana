/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicySelectorProps } from './policy_selector';
import { PolicySelector } from './policy_selector';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { allFleetHttpMocks } from '../../mocks';
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { getPolicyDetailPath } from '../../common/routing';
import { pagePathGetters } from '@kbn/fleet-plugin/public';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('PolicySelector component', () => {
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let testPolicyId: string;
  let props: PolicySelectorProps;
  let render: (
    props?: Partial<PolicySelectorProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const clickOnPolicy = (policyId: string = testPolicyId) => {
    act(() => {
      fireEvent.click(renderResult.getByTestId(`test-policy-${policyId}`));
    });
  };

  const clickOnSelectAll = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId(`test-selectAllButton`));
    });
  };

  const clickOnUnSelectAll = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId(`test-unselectAllButton`));
    });
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = allFleetHttpMocks(mockedContext.coreStart.http);

    testPolicyId = apiMocks.responseProvider.packagePolicies().items[0].id;
    apiMocks.responseProvider.packagePolicies.mockClear();

    props = {
      selectedPolicyIds: [],
      onChange: jest.fn((updatedPolicySelection, updatedAdditionalItems) => {
        // Update props and re-render component so we get the latest state of it after user interactions
        const updatedProps: PolicySelectorProps = {
          ...props,
          selectedPolicyIds: updatedPolicySelection,
          additionalListItems: updatedAdditionalItems,
        };

        renderResult.rerender(<PolicySelector {...updatedProps} />);
      }),
      'data-test-subj': 'test',
    };

    render = async (): Promise<ReturnType<AppContextTestRender['render']>> => {
      renderResult = mockedContext.render(<PolicySelector {...props} />);

      // Wait for API to be called
      await waitFor(() => {
        expect(apiMocks.responseProvider.packagePolicies).toHaveBeenCalled();
        expect(renderResult.queryByTestId('test-isFetching')).toBeNull();
      });

      return renderResult;
    };
  });

  it('should display expected interface', async () => {
    const { getByTestId, queryByTestId } = await render();

    expect(getByTestId('test-searchbar')).toBeTruthy();
    expect(getByTestId('test-viewSelectedButton')).toBeTruthy();
    expect((getByTestId('test-viewSelectedButton') as HTMLButtonElement).disabled).toBe(true);
    expect(getByTestId('test-policyFetchTotal')).toBeTruthy();
    expect(getByTestId('test-pagination')).toBeTruthy();
    expect(queryByTestId(`test-policy-${testPolicyId}-checkbox`)).toBeNull();
    expect(queryByTestId(`test-policy-${testPolicyId}-policyLink`)).toBeNull();
  });

  it('should enable the selected policies button when policies are selected', async () => {
    const { getByTestId } = await render();
    clickOnPolicy();

    expect(getByTestId('test-viewSelectedButton').textContent).toEqual('1 selected');
    expect((getByTestId('test-viewSelectedButton') as HTMLButtonElement).disabled).toBe(false);
    expect(props.onChange).toHaveBeenCalledWith([testPolicyId], []);
  });

  it('should select all policies displayed when "select all" is clicked', async () => {
    const { getByTestId } = await render();
    clickOnSelectAll();

    expect(getByTestId('test-viewSelectedButton').textContent).toEqual('3 selected');
    expect(props.onChange).toHaveBeenCalledWith(
      [
        testPolicyId,
        'ddf6570b-9175-4a6d-b288-61a09771c647',
        'b8e616ae-44fc-4be7-846c-ce8fa5c082dd',
      ],
      []
    );
  });

  it('should un-select all policies displayed when "un-select all" is clicked', async () => {
    props.selectedPolicyIds = [testPolicyId, 'ddf6570b-9175-4a6d-b288-61a09771c647'];
    const { getByTestId } = await render();

    expect(getByTestId(`test-policy-${testPolicyId}`).getAttribute('aria-checked')).toEqual('true');
    expect(
      getByTestId(`test-policy-ddf6570b-9175-4a6d-b288-61a09771c647`).getAttribute('aria-checked')
    ).toEqual('true');

    clickOnUnSelectAll();

    expect(getByTestId('test-viewSelectedButton').textContent).toEqual('0 selected');
    expect(props.onChange).toHaveBeenCalledWith([], []);
  });

  it('should use search value typed by user when fetching from fleet', async () => {
    const { getByTestId } = await render();
    act(() => {
      userEvent.type(getByTestId('test-searchbar'), 'foo');
    });

    await waitFor(() => {
      expect(mockedContext.coreStart.http.get).toHaveBeenCalledWith(
        packagePolicyRouteService.getListPath(),
        {
          query: {
            kuery:
              '(ingest-package-policies.package.name: endpoint) AND ((ingest-package-policies.name:*foo*) OR (ingest-package-policies.description:*foo*) OR (ingest-package-policies.policy_ids:*foo*) OR (ingest-package-policies.package.name:*foo*))',
            page: 1,
            perPage: 20,
            sortField: 'name',
            sortOrder: 'asc',
            withAgentCount: false,
          },
          version: '2023-10-31',
        }
      );
    });
  });

  it('should display a checkbox when "useCheckbox" prop is true', async () => {
    props.useCheckbox = true;
    const { getByTestId } = await render();

    expect(getByTestId(`test-policy-${testPolicyId}-checkbox`)).toBeTruthy();
  });

  describe('and when "showPolicyLink" prop is true', () => {
    let endpointPolicyId: string;
    let endpointPolicyTestId: string;
    let nonEndpointPolicyId: string;
    let nonEndpontPolicyTestId: string;
    let privilegeSetter: ReturnType<AppContextTestRender['getUserPrivilegesMockSetter']>;

    beforeEach(() => {
      const fleetPackagePolicyGenerator = new FleetPackagePolicyGenerator('seed');

      privilegeSetter = mockedContext.getUserPrivilegesMockSetter(useUserPrivilegesMock);

      privilegeSetter.set({
        canReadPolicyManagement: true,
        canWriteIntegrationPolicies: true,
      });

      const apiReturnedItems = [
        fleetPackagePolicyGenerator.generateEndpointPackagePolicy(),
        fleetPackagePolicyGenerator.generate({
          package: {
            name: 'some-other-integration',
            title: 'some-other-integration',
            version: '1.0.0',
          },
        }),
      ];
      endpointPolicyId = apiReturnedItems[0].id;
      endpointPolicyTestId = `test-policy-${endpointPolicyId}-policyLink`;
      nonEndpointPolicyId = apiReturnedItems[1].id;
      nonEndpontPolicyTestId = `test-policy-${nonEndpointPolicyId}-policyLink`;
      props.showPolicyLink = true;
      apiMocks.responseProvider.packagePolicies.mockReturnValue({
        items: apiReturnedItems,
        total: 2,
        page: 1,
        perPage: 20,
      });
    });

    it('should display "view policy" link when "showPolicyLink" prop is true', async () => {
      const { getByTestId } = await render();

      expect(getByTestId(endpointPolicyTestId)).toBeTruthy();
      expect(getByTestId(nonEndpontPolicyTestId)).toBeTruthy();
    });

    it('should display correct policy link url for endpoint polices', async () => {
      const { getByTestId } = await render();

      expect((getByTestId(endpointPolicyTestId) as HTMLAnchorElement).href).toMatch(
        getPolicyDetailPath(endpointPolicyId)
      );
    });

    it('should display correct policy link url for NON-endpoint polices', async () => {
      const { getByTestId } = await render();

      expect((getByTestId(nonEndpontPolicyTestId) as HTMLAnchorElement).href).toMatch(
        pagePathGetters.integration_policy_edit({ packagePolicyId: nonEndpointPolicyId })[1]
      );
    });

    it('should NOT display the "view policy" link if user does not have privileges', async () => {
      privilegeSetter.set({
        canReadPolicyManagement: false,
        canWriteIntegrationPolicies: false,
      });
      const { queryByTestId } = await render();

      expect(queryByTestId(endpointPolicyTestId)).toBeNull();
      expect(queryByTestId(nonEndpontPolicyTestId)).toBeNull();
    });
  });

  describe('and when the "Selected" policies button is clicked', () => {
    it.todo('should displayed selected policies');

    it.todo('should disable search field');

    it.todo('should display total policies currently selected');

    it.todo('should display "un-select all" button');

    it.todo('should NOT display "select all" button');

    it.todo('should remove item from the list when it is unselected');

    it.todo('should revert back to the full policy list when all items are unselected');
  });

  describe('and "additionalListItems" prop is provided', () => {
    it.todo('should display the additional items on the list');

    it.todo('should include selection updates to additional items in the call to onChange');

    it.todo('should display with a checkbox when "useCheckbox" prop is true');
  });

  it.todo('should use defined "queryOptions" in API call to fleet');

  it.todo('should call "onChange" when policy selection changes');

  it.todo('should call "onFetch" when ever the Fleet API is called');

  it.todo('should allow policy display configuration via "policyDisplayOptions" prop');

  it.todo('should display as readonly when "isDisabled" prop is true');

  it.todo('should display no policies found empty state');

  it.todo('should display progress animation while fetching data from fleet');

  it.todo('should display API errors via a toast message');
});
