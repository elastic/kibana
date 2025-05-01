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
import type { BulkGetPackagePoliciesRequestBody } from '@kbn/fleet-plugin/common/types';
import { policySelectorMocks } from './mocks';

jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;

describe('PolicySelector component', () => {
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let testPolicyId1: string;
  let testPolicyId2: string;
  let testPolicyId3: string;
  let props: PolicySelectorProps;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  // Note: testUtils will only be set after render()
  let testUtils: ReturnType<typeof policySelectorMocks.getTestHelpers>;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = allFleetHttpMocks(mockedContext.coreStart.http);

    const apiPolicies = apiMocks.responseProvider.packagePolicies().items;
    testPolicyId1 = apiPolicies[0].id;
    testPolicyId2 = apiPolicies[1].id;
    testPolicyId3 = apiPolicies[2].id;
    apiMocks.responseProvider.packagePolicies.mockClear();

    // Mock API to have a total count that will trigger multiple pages in the UI
    const generatePackagePoliciesResponse =
      apiMocks.responseProvider.packagePolicies.getMockImplementation()!;
    apiMocks.responseProvider.packagePolicies.mockImplementation(() => {
      return {
        ...generatePackagePoliciesResponse(),
        total: 50,
      };
    });

    // Mock the BulkGet API to return a record for each policy id that was requested
    apiMocks.responseProvider.bulkPackagePolicies.mockImplementation(
      ({ body } = { body: JSON.stringify({ ids: [] }), path: '' }) => {
        const reqBody = JSON.parse(body as string) as BulkGetPackagePoliciesRequestBody;
        const fleetPackagePolicyGenerator = new FleetPackagePolicyGenerator('seed');

        return {
          items: reqBody.ids.map((id) => fleetPackagePolicyGenerator.generate({ id })),
        };
      }
    );

    props = {
      selectedPolicyIds: [],
      onChange: jest.fn((updatedPolicySelection, updatedAdditionalItems) => {
        // Update props and re-render component so we get the latest state of it after user interactions
        const updatedProps: PolicySelectorProps = {
          ...props,
          selectedPolicyIds: updatedPolicySelection,
          additionalListItems: updatedAdditionalItems,
        };

        act(() => {
          renderResult.rerender(<PolicySelector {...updatedProps} />);
        });
      }),
      'data-test-subj': 'test',
    };

    render = async (): Promise<ReturnType<AppContextTestRender['render']>> => {
      renderResult = mockedContext.render(<PolicySelector {...props} />);
      testUtils = policySelectorMocks.getTestHelpers(props['data-test-subj']!, renderResult);

      // Wait for API to be called
      await waitFor(async () => {
        expect(apiMocks.responseProvider.packagePolicies).toHaveBeenCalled();
        await testUtils.waitForDataToLoad();
      });

      return renderResult;
    };
  });

  it('should display expected interface', async () => {
    const { getByTestId, queryByTestId } = await render();

    expect(getByTestId('test-searchbar')).toBeTruthy();
    expect(getByTestId('test-viewSelectedButton')).toBeTruthy();
    expect((getByTestId('test-viewSelectedButton') as HTMLButtonElement).disabled).toBe(true);
    expect(getByTestId(testUtils.testIds.policyFetchTotal)).toBeTruthy();
    expect(getByTestId('test-pagination')).toBeTruthy();
    expect(queryByTestId(`test-policy-${testPolicyId1}-checkbox`)).toBeNull();
    expect(queryByTestId(`test-policy-${testPolicyId1}-policyLink`)).toBeNull();
  });

  it('should enable the selected policies button when policies are selected', async () => {
    const { getByTestId } = await render();
    testUtils.clickOnPolicy(testPolicyId1);

    expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual('1 of 50 selected');
    expect((getByTestId('test-viewSelectedButton') as HTMLButtonElement).disabled).toBe(false);
    expect(props.onChange).toHaveBeenCalledWith([testPolicyId1], []);
  });

  it('should select all policies displayed when "select all" is clicked', async () => {
    const { getByTestId } = await render();
    testUtils.clickOnSelectAll();

    expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual('3 of 50 selected');
    expect(props.onChange).toHaveBeenCalledWith([testPolicyId1, testPolicyId2, testPolicyId3], []);
  });

  it('should un-select all policies displayed when "un-select all" is clicked', async () => {
    props.selectedPolicyIds = [testPolicyId1, testPolicyId2];
    const { getByTestId } = await render();

    expect(getByTestId(`test-policy-${testPolicyId1}`).getAttribute('aria-checked')).toEqual(
      'true'
    );
    expect(getByTestId(`test-policy-${testPolicyId2}`).getAttribute('aria-checked')).toEqual(
      'true'
    );

    testUtils.clickOnUnSelectAll();

    expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual('0 of 50 selected');
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
              '(ingest-package-policies.package.name: endpoint) AND ((ingest-package-policies.name:*foo*) OR (ingest-package-policies.description:*foo*))',
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

    expect(getByTestId(`test-policy-${testPolicyId1}-checkbox`)).toBeTruthy();
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
    beforeEach(() => {
      props.selectedPolicyIds = [testPolicyId1, testPolicyId2];

      const renderComponent = render;
      render = () =>
        renderComponent().then(async (result) => {
          testUtils.clickOnViewSelected();

          // Wait for API to be called
          await waitFor(() => {
            expect(apiMocks.responseProvider.bulkPackagePolicies).toHaveBeenCalled();
            expect(renderResult.queryByTestId('test-isFetching')).toBeNull();
          });

          return result;
        });
    });

    it('should displayed selected policies', async () => {
      const { getByTestId } = await render();

      expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual('2 selected');
      expect(getByTestId(`test-policy-${testPolicyId1}`).getAttribute('aria-checked')).toEqual(
        'true'
      );
      expect(getByTestId(`test-policy-${testPolicyId2}`).getAttribute('aria-checked')).toEqual(
        'true'
      );
    });

    it('should disable search field', async () => {
      const { getByTestId } = await render();

      expect((getByTestId('test-searchbar') as HTMLInputElement).disabled).toBe(true);
    });

    it('should display "un-select all" button', async () => {
      const { getByTestId } = await render();

      expect(getByTestId('test-unselectAllButton')).toBeTruthy();
    });

    it('should NOT display "select all" button', async () => {
      const { queryByTestId } = await render();

      expect(queryByTestId('test-selectAllButton')).toBeNull();
    });

    it('should remove item from the list when it is unselected', async () => {
      const { queryByTestId, getByTestId } = await render();
      testUtils.clickOnPolicy(testPolicyId2);

      expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual('1 selected');
      expect(props.onChange).toHaveBeenCalledWith([testPolicyId1], []);
      await waitFor(() => {
        expect(queryByTestId(`test-policy-${testPolicyId2}`)).toBeNull();
      });
    });

    it('should revert back to the full policy list when all items are unselected', async () => {
      const { getByTestId } = await render();
      testUtils.clickOnUnSelectAll();
      await testUtils.waitForDataToLoad();

      expect(props.onChange).toHaveBeenCalledWith([], []);
      expect((getByTestId('test-searchbar') as HTMLInputElement).disabled).toBe(false);
      expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual(
        '0 of 50 selected'
      );
    });
  });

  describe('and "additionalListItems" prop is provided', () => {
    beforeEach(() => {
      props.additionalListItems = [
        {
          label: 'Item 1',
          checked: 'on', // << This one is selected
          'data-test-subj': 'customItem1',
        },
        {
          label: 'Item 2',
          checked: undefined,
          'data-test-subj': 'customItem2',
        },
      ];
    });

    it('should display the additional items on the list', async () => {
      const { getByTestId } = await render();

      expect(getByTestId('customItem1')).toBeTruthy();
      expect(getByTestId('customItem2')).toBeTruthy();
      expect(getByTestId(testUtils.testIds.policyFetchTotal).textContent).toEqual(
        '1 of 52 selected'
      );
    });

    it('should show custom items in the selected items', async () => {
      const { getByTestId, queryByTestId } = await render();
      testUtils.clickOnViewSelected();
      await testUtils.waitForDataToLoad();

      expect(getByTestId('customItem1')).toBeTruthy();
      expect(queryByTestId('customItem2')).toBeNull();
    });

    it('should include selection updates to additional items in the call to onChange', async () => {
      const { getByTestId } = await render();
      act(() => {
        fireEvent.click(getByTestId(`customItem1`));
      });

      expect(props.onChange).toHaveBeenCalledWith(
        [],
        [
          {
            label: 'Item 1',
            checked: undefined,
            'data-test-subj': 'customItem1',
          },
          {
            label: 'Item 2',
            checked: undefined,
            'data-test-subj': 'customItem2',
          },
        ]
      );
    });

    it('should display with a checkbox when "useCheckbox" prop is true', async () => {
      props.useCheckbox = true;
      const { getByTestId } = await render();

      expect(getByTestId('test-customItem1-checkbox')).toBeTruthy();
      expect(getByTestId('test-customItem2-checkbox')).toBeTruthy();
    });
  });

  it('should default queryOptions.kuery to endpoint packages filter', async () => {
    await render();

    expect(mockedContext.coreStart.http.get).toHaveBeenCalledWith(
      packagePolicyRouteService.getListPath(),
      {
        query: {
          kuery: 'ingest-package-policies.package.name: endpoint',
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

  it('should use defined "queryOptions" in API call to fleet', async () => {
    props.queryOptions = {
      kuery: '',
      perPage: 100,
      sortField: 'description',
      sortOrder: 'desc',
      withAgentCount: true,
    };
    await render();

    expect(mockedContext.coreStart.http.get).toHaveBeenCalledWith(
      packagePolicyRouteService.getListPath(),
      {
        query: {
          kuery: '',
          page: 1,
          perPage: 100,
          sortField: 'description',
          sortOrder: 'desc',
          withAgentCount: true,
        },
        version: '2023-10-31',
      }
    );
  });

  it('should call "onFetch" after having queried Fleet API', async () => {
    props.selectedPolicyIds = [testPolicyId1];
    props.onFetch = jest.fn();
    await render();

    expect(props.onFetch).toHaveBeenCalledWith({
      data: expect.objectContaining({
        page: 1,
        perPage: 10,
        total: 50,
        items: expect.any(Array),
      }),
      type: 'search',
      filtered: false,
    });

    // Click the selected policies and check that onFetch is called with the results from the Bulk Get API
    testUtils.clickOnViewSelected();
    await testUtils.waitForDataToLoad();

    expect(props.onFetch).toHaveBeenCalledWith({
      data: expect.objectContaining({
        page: 1,
        perPage: 20,
        total: 1,
        items: expect.any(Array),
      }),
      type: 'selected',
      filtered: false,
    });
  });

  it('should allow policy display configuration via "policyDisplayOptions" prop', async () => {
    props.policyDisplayOptions = jest.fn((_policy) => {
      return { disabled: true };
    });
    const { getByTestId } = await render();

    expect(getByTestId(`test-policy-${testPolicyId1}`).getAttribute('aria-disabled')).toEqual(
      'true'
    );
    expect(getByTestId(`test-policy-${testPolicyId2}`).getAttribute('aria-disabled')).toEqual(
      'true'
    );
    expect(getByTestId(`test-policy-${testPolicyId3}`).getAttribute('aria-disabled')).toEqual(
      'true'
    );
  });

  it('should display as readonly when "isDisabled" prop is true', async () => {
    props.isDisabled = true;
    props.useCheckbox = true;
    props.selectedPolicyIds = [testPolicyId1];
    props.additionalListItems = [{ label: 'custom item 1', 'data-test-subj': 'customItem1' }];
    const { getByTestId } = await render();

    [testPolicyId2, testPolicyId3].forEach((policyId) => {
      expect(getByTestId(`test-policy-${policyId}`).getAttribute('aria-disabled')).toEqual('true');
      expect((getByTestId(`test-policy-${policyId}-checkbox`) as HTMLInputElement).disabled).toBe(
        true
      );
    });

    // We don't disable custom items since those can be fully controlled by the caller of the component
    expect(getByTestId('customItem1').getAttribute('aria-disabled')).toEqual('true');
    expect((getByTestId('test-customItem1-checkbox') as HTMLInputElement).disabled).toBe(true);

    expect((getByTestId('test-searchbar') as HTMLInputElement).disabled).toBe(true);
    expect((getByTestId('test-selectAllButton') as HTMLButtonElement).disabled).toBe(true);
    expect((getByTestId('test-unselectAllButton') as HTMLButtonElement).disabled).toBe(true);

    // Pagination and View Selected button should NOT be disabled
    expect((getByTestId('test-viewSelectedButton') as HTMLButtonElement).disabled).toBe(false);
    expect((getByTestId('pagination-button-next') as HTMLButtonElement).disabled).toBe(false);

    // should still be able to see selected, but they also would be disabled
    testUtils.clickOnViewSelected();
    await testUtils.waitForDataToLoad();

    expect((getByTestId('test-unselectAllButton') as HTMLButtonElement).disabled).toBe(true);
    expect(getByTestId(`test-policy-${testPolicyId1}`).getAttribute('aria-disabled')).toEqual(
      'true'
    );
    expect(
      (getByTestId(`test-policy-${testPolicyId1}-checkbox`) as HTMLInputElement).disabled
    ).toBe(true);
  });

  it('should allow additionalListItems to override the isDisabled prop default', async () => {
    props.isDisabled = true;
    props.useCheckbox = true;
    props.additionalListItems = [
      { label: 'custom item 1', 'data-test-subj': 'customItem1', disabled: false },
    ];
    const { getByTestId } = await render();

    expect(getByTestId('customItem1').getAttribute('aria-disabled')).toEqual('false');
    expect((getByTestId('test-customItem1-checkbox') as HTMLInputElement).disabled).toBe(false);
  });

  it('should display no policies found empty state', async () => {
    apiMocks.responseProvider.packagePolicies.mockReturnValue({
      items: [],
      page: 1,
      perPage: 20,
      total: 0,
    });
    const { getByTestId } = await render();

    expect(getByTestId('test-noPolicies').textContent).toEqual('No policies found');
  });

  it('should display API errors via a toast message', async () => {
    const err = new Error('something failed!');
    apiMocks.responseProvider.packagePolicies.mockImplementation(() => {
      throw err;
    });
    await render();

    expect(mockedContext.coreStart.notifications.toasts.addError).toHaveBeenCalledWith(err, {
      title: 'Failed to fetch list of policies',
      toastMessage: undefined,
    });
  });
});
