/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useUserPrivileges } from '../../../common/components/user_privileges';

import type { SearchExceptionsProps } from '.';
import { SearchExceptions } from '.';
import { getEndpointPrivilegesInitialStateMock } from '../../../common/components/user_privileges/endpoint/mocks';
import type { UserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { initialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import type { EndpointPrivileges } from '../../../../common/endpoint/types';
import { allFleetHttpMocks } from '../../mocks';

jest.mock('../../../common/components/user_privileges');

let onSearchMock: jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

describe('Search exceptions', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<SearchExceptionsProps>
  ) => ReturnType<AppContextTestRender['render']>;

  const loadedUserPrivilegesState = (
    endpointOverrides: Partial<EndpointPrivileges> = {}
  ): UserPrivilegesState => {
    return {
      ...initialUserPrivilegesState(),
      endpointPrivileges: getEndpointPrivilegesInitialStateMock({
        ...endpointOverrides,
      }),
    };
  };

  beforeEach(() => {
    onSearchMock = jest.fn();
    appTestContext = createAppRootMockRenderer();

    allFleetHttpMocks(appTestContext.coreStart.http);

    render = (overrideProps = {}) => {
      const props: SearchExceptionsProps = {
        placeholder: 'search test',
        onSearch: onSearchMock,
        ...overrideProps,
      };

      renderResult = appTestContext.render(<SearchExceptions {...props} />);
      return renderResult;
    };

    mockUseUserPrivileges.mockReturnValue(loadedUserPrivilegesState());
  });

  afterAll(() => {
    mockUseUserPrivileges.mockReset();
  });

  it('should have a default value', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });

    expect(element.getByDisplayValue(expectedDefaultValue)).not.toBeNull();
  });

  it('should dispatch search action when submit search field', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render();
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.change(element.getByTestId('searchField'), {
        target: { value: expectedDefaultValue },
      });
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', false);
  });

  it('should dispatch search action when click on button', () => {
    const expectedDefaultValue = 'this is a default value';
    const element = render({ defaultValue: expectedDefaultValue });
    expect(onSearchMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(element.getByTestId('searchButton'));
    });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith(expectedDefaultValue, '', true);
  });

  it('should hide refresh button', () => {
    const element = render({ hideRefreshButton: true });

    expect(element.queryByTestId('searchButton')).toBeNull();
  });

  it('should hide policies selector when no license', () => {
    mockUseUserPrivileges.mockReturnValue(
      loadedUserPrivilegesState({ canCreateArtifactsByPolicy: false })
    );
    const element = render({ hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).toBeNull();
  });

  it('should display policies selector when right license', () => {
    const element = render({ hasPolicyFilter: true });

    expect(element.queryByTestId('policiesSelectorButton')).not.toBeNull();
  });

  it('should display additional policy selection items', async () => {
    const element = render({ hasPolicyFilter: true });
    act(() => {
      fireEvent.click(element.getByTestId(`policiesSelectorButton`));
    });
    await waitFor(() => {
      expect(element.queryByTestId('policiesSelectorButton-policySelector-isFetching')).toBeNull();
    });

    expect(element.getByTestId('globalOption')).toBeTruthy();
    expect(element.getByTestId('unassignedOption')).toBeTruthy();
  });

  it('should include global option in onSearch call when user clicks on it', async () => {
    const element = render({ hasPolicyFilter: true });
    act(() => {
      fireEvent.click(element.getByTestId(`policiesSelectorButton`));
    });
    await waitFor(() => {
      expect(element.queryByTestId('policiesSelectorButton-policySelector-isFetching')).toBeNull();
    });
    act(() => {
      fireEvent.click(element.getByTestId(`globalOption`));
    });

    expect(onSearchMock).toHaveBeenCalledWith('', 'global', false);
  });

  describe('enabled status filter', () => {
    let onEnabledStatusChangeMock: jest.Mock;

    beforeEach(() => {
      onEnabledStatusChangeMock = jest.fn();
    });

    it('should not show the filter without onEnabledStatusChange', () => {
      const element = render();

      expect(element.queryByTestId('enabledStatusFilter')).toBeNull();
    });

    it('should show Enabled and Disabled buttons, none selected by default', () => {
      const element = render({ onEnabledStatusChange: onEnabledStatusChangeMock });

      expect(element.getByTestId('enabledStatusFilter-enabled')).toHaveTextContent('Enabled');
      expect(element.getByTestId('enabledStatusFilter-enabled')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(element.getByTestId('enabledStatusFilter-disabled')).toHaveTextContent('Disabled');
      expect(element.getByTestId('enabledStatusFilter-disabled')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    it('should show the selected status', () => {
      const element = render({
        enabledStatus: 'disabled',
        onEnabledStatusChange: onEnabledStatusChangeMock,
      });

      expect(element.getByTestId('enabledStatusFilter-enabled')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(element.getByTestId('enabledStatusFilter-disabled')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it.each(['enabled', 'disabled'] as const)('should select %s when clicked', (enabledStatus) => {
      const element = render({ onEnabledStatusChange: onEnabledStatusChangeMock });

      fireEvent.click(element.getByTestId(`enabledStatusFilter-${enabledStatus}`));

      expect(onEnabledStatusChangeMock).toHaveBeenCalledWith(enabledStatus);
      expect(onSearchMock).not.toHaveBeenCalled();
    });

    it('should switch to the other status when it is clicked', () => {
      const element = render({
        enabledStatus: 'enabled',
        onEnabledStatusChange: onEnabledStatusChangeMock,
      });

      fireEvent.click(element.getByTestId('enabledStatusFilter-disabled'));

      expect(onEnabledStatusChangeMock).toHaveBeenCalledWith('disabled');
    });

    it('should clear the status when the selected one is clicked', () => {
      const element = render({
        enabledStatus: 'enabled',
        onEnabledStatusChange: onEnabledStatusChangeMock,
      });

      fireEvent.click(element.getByTestId('enabledStatusFilter-enabled'));

      expect(onEnabledStatusChangeMock).toHaveBeenCalledWith(undefined);
    });
  });

  it('should show global and unassigned policy options checked', async () => {
    const element = render({ hasPolicyFilter: true, defaultIncludedPolicies: 'global,unassigned' });
    act(() => {
      fireEvent.click(element.getByTestId(`policiesSelectorButton`));
    });
    await waitFor(() => {
      expect(element.queryByTestId('policiesSelectorButton-policySelector-isFetching')).toBeNull();
    });

    expect(element.getByTestId('globalOption').getAttribute('aria-checked')).toEqual('true');
    expect(element.getByTestId('unassignedOption').getAttribute('aria-checked')).toEqual('true');
  });
});
