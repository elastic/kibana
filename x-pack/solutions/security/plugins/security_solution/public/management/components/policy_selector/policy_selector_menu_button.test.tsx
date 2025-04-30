/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../common/mock/endpoint';
import { allFleetHttpMocks } from '../../mocks';
import type { PolicySelectorProps } from './policy_selector';
import { act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PolicySelectorMenuButton } from './policy_selector_menu_button';

describe('PolicySelectorMenuButton component', () => {
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let testPolicyId1: string;
  let props: PolicySelectorProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const clickOnButton = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId(`test`));
    });
  };

  const waitForDataToLoad = async () => {
    await waitFor(() => {
      expect(renderResult.queryByTestId('test-policySelector-isFetching')).toBeNull();
    });
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = allFleetHttpMocks(mockedContext.coreStart.http);

    const apiPolicies = apiMocks.responseProvider.packagePolicies().items;
    testPolicyId1 = apiPolicies[0].id;
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

        act(() => {
          renderResult.rerender(<PolicySelectorMenuButton {...updatedProps} />);
        });
      }),
      'data-test-subj': 'test',
    };

    render = (): ReturnType<AppContextTestRender['render']> => {
      renderResult = mockedContext.render(<PolicySelectorMenuButton {...props} />);
      return renderResult;
    };
  });

  it('should display a button', async () => {
    const { getByTestId } = render();

    expect(getByTestId('test').textContent).toEqual('Policies');
  });

  it('should display button as disabled when "isDisabled" prop is true', async () => {
    props.isDisabled = true;
    const { getByTestId } = render();

    expect((getByTestId('test') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should display policy selector when button is clicked', async () => {
    const { getByTestId } = render();
    clickOnButton();

    expect(getByTestId('test-policySelector')).toBeTruthy();
  });

  it('should hide policy selector if button is clicked after popup was opened', async () => {
    const { getByTestId, queryByTestId } = render();
    clickOnButton();

    expect(getByTestId('test-policySelector')).toBeTruthy();

    clickOnButton();

    await waitFor(() => {
      expect(queryByTestId('test-policySelector')).toBeNull();
    });
  });

  it('should display total count of policies once the popover has been opened once', async () => {
    const { getByTestId } = render();
    clickOnButton();
    await waitForDataToLoad();

    expect(getByTestId('test').textContent).toEqual('Policies3');
  });

  it('should display count of selected filters', async () => {
    const { getByTestId } = render();
    clickOnButton();
    await waitForDataToLoad();
    act(() => {
      fireEvent.click(getByTestId(`test-policySelector-policy-${testPolicyId1}`));
    });

    expect(getByTestId('test').textContent).toEqual('Policies1');
  });

  it('should display count of selected filters that includes additionalListItems', async () => {
    props.additionalListItems = [{ label: 'custom item 1', 'data-test-subj': 'customItem1' }];
    const { getByTestId } = render();
    clickOnButton();
    await waitForDataToLoad();
    act(() => {
      fireEvent.click(getByTestId(`customItem1`));
    });

    expect(getByTestId('test').textContent).toEqual('Policies1');
  });
});
