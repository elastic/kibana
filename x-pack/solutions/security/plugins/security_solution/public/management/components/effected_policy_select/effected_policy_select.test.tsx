/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffectedPolicySelectProps } from './effected_policy_select';
import { EffectedPolicySelect } from './effected_policy_select';
import React from 'react';
import { forceHTMLElementOffsetWidth } from './test_utils';
import { fireEvent, act, waitFor } from '@testing-library/react';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import { useLicense as _useLicense } from '../../../common/hooks/use_license';
import type { LicenseService } from '../../../../common/license';
import { buildPerPolicyTag } from '../../../../common/endpoint/service/artifacts/utils';
import { ARTIFACT_POLICIES_NOT_ACCESSIBLE_IN_ACTIVE_SPACE_MESSAGE } from '../../common/translations';
import { fleetBulkGetPackagePoliciesListHttpMock } from '../../mocks';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('when using EffectedPolicySelect component', () => {
  const generator = new EndpointDocGenerator('effected-policy-select');

  let mockedContext: AppContextTestRender;
  let componentProps: EffectedPolicySelectProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const handleOnChange: jest.MockedFunction<EffectedPolicySelectProps['onChange']> = jest.fn();
  const render = (props: Partial<EffectedPolicySelectProps> = {}) => {
    componentProps = {
      ...componentProps,
      ...props,
    };
    renderResult = mockedContext.render(<EffectedPolicySelect {...componentProps} />);
    return renderResult;
  };
  let resetHTMLElementOffsetWidth: () => void;

  beforeAll(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
  });

  afterAll(() => resetHTMLElementOffsetWidth());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    // Default props
    componentProps = {
      item: new ExceptionsListItemGenerator('seed').generateTrustedApp({
        tags: [GLOBAL_ARTIFACT_TAG],
      }),
      options: [],
      onChange: handleOnChange,
      'data-test-subj': 'test',
    };

    (useLicenseMock() as jest.Mocked<LicenseService>).isPlatinumPlus.mockReturnValue(true);
  });

  afterEach(() => {
    handleOnChange.mockClear();
  });

  describe('and no policy entries exist', () => {
    it('should display no options available message', () => {
      componentProps.item.tags = [];
      const { getByTestId } = render();
      const euiSelectableMessageElement =
        getByTestId('test-policiesSelectable').getElementsByClassName('euiSelectableMessage')[0];
      expect(euiSelectableMessageElement).not.toBeNull();
      expect(euiSelectableMessageElement.textContent).toEqual('No options available');
    });
  });

  describe('and policy entries exist', () => {
    const policyId = 'abc123';
    const policyTestSubj = `policy-${policyId}`;

    const selectGlobalPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('test-global'));
      });
    };

    const selectPerPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId('test-perPolicy'));
      });
    };

    const clickOnPolicy = () => {
      act(() => {
        fireEvent.click(renderResult.getByTestId(policyTestSubj));
      });
    };

    beforeEach(() => {
      const policy = generator.generatePolicyPackagePolicy();
      policy.name = 'test policy A';
      policy.id = policyId;

      componentProps = {
        ...componentProps,
        options: [policy],
      };

      handleOnChange.mockImplementation((updatedItem) => {
        componentProps = {
          ...componentProps,
          item: updatedItem,
        };
        renderResult.rerender(<EffectedPolicySelect {...componentProps} />);
      });
    });

    it('should display policies', () => {
      componentProps.item.tags = [];
      const { getByTestId } = render();
      expect(getByTestId(policyTestSubj));
    });

    it('should hide policy items if global is checked', () => {
      const { queryByTestId } = render();
      expect(queryByTestId(policyTestSubj)).toBeNull();
    });

    it('should show policy items when user clicks per-policy', async () => {
      const { getByTestId } = render();
      selectPerPolicy();

      expect(getByTestId(policyTestSubj)).not.toBeNull();
    });

    it('should call onChange with updated item', () => {
      render();

      selectPerPolicy();
      expect(handleOnChange.mock.calls[0][0]).toEqual({
        ...componentProps.item,
        tags: [],
      });

      selectGlobalPolicy();
      expect(handleOnChange.mock.calls[1][0]).toEqual(componentProps.item);
    });

    it('should maintain policies selection even if global was checked, and user switched back to per policy', () => {
      const { debug } = render();
      debug(undefined, 999999);

      selectPerPolicy();
      clickOnPolicy();
      // FYI: If wondering why `componentProps.item` is being used successfully here and below:
      // its because `handlOnChange` is setup above to re-render the component everytime an update
      // is received, thus it will always reflect the latest state of the artifact
      expect(handleOnChange).toHaveBeenLastCalledWith(componentProps.item);

      // Toggle isGlobal back to True
      selectGlobalPolicy();
      expect(handleOnChange).toHaveBeenLastCalledWith(componentProps.item);
    });

    it('should show loader only when by policy selected', () => {
      componentProps.isLoading = true;
      const { queryByTestId, getByTestId, rerender } = render();
      expect(queryByTestId('loading-spinner')).toBeNull();

      componentProps.item = {
        ...componentProps.item,
        tags: [],
      };
      rerender(<EffectedPolicySelect {...componentProps} />);

      expect(getByTestId('loading-spinner')).not.toBeNull();
    });

    it('should hide policy link when no policy management privileges', () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: {
          loading: false,
          canWritePolicyManagement: false,
          canReadPolicyManagement: false,
        },
      });
      componentProps.item.tags = [];
      const { queryByTestId } = render();
      expect(queryByTestId('test-policyLink')).toBeNull();
    });

    it('should show policy link when all policy management privileges', () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: {
          loading: false,
          canWritePolicyManagement: true,
          canReadPolicyManagement: true,
        },
      });
      componentProps.item.tags = [];
      const { getByTestId } = render();
      expect(getByTestId('test-policyLink'));
    });

    it('should show policy link when read policy management privileges', () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        endpointPrivileges: {
          loading: false,
          canWritePolicyManagement: false,
          canReadPolicyManagement: true,
        },
      });
      componentProps.item.tags = [];
      const { getByTestId } = render();
      expect(getByTestId('test-policyLink'));
    });

    describe('and space awareness is enabled', () => {
      let httpMocks: ReturnType<typeof fleetBulkGetPackagePoliciesListHttpMock>;

      beforeEach(() => {
        mockedContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: true });
        componentProps.item.tags = [buildPerPolicyTag('321')];
        httpMocks = fleetBulkGetPackagePoliciesListHttpMock(mockedContext.coreStart.http);
        httpMocks.responseProvider.bulkPackagePolicies.mockReturnValue({
          items: [new FleetPackagePolicyGenerator('seed').generate({ id: 'abc123' })],
        });
      });

      it('should display count of policies assigned to artifact that are not accessible in active space', async () => {
        const { getByTestId } = render();

        await waitFor(() => {
          expect(getByTestId('test-unAccessiblePoliciesCallout').textContent).toEqual(
            ARTIFACT_POLICIES_NOT_ACCESSIBLE_IN_ACTIVE_SPACE_MESSAGE(1)
          );
        });
      });

      it('should disable global button if user has no global artifact privilege', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...initialUserPrivilegesState(),
          endpointPrivileges: {
            loading: false,
            canManageGroupPolicies: false,
          },
        });
        const { getByTestId } = render();

        expect((getByTestId('test-global') as HTMLButtonElement).disabled).toBe(true);
      });

      it('should preserve assignment to policies not currently accessible in active space', async () => {
        const { getByTestId } = render();
        await waitFor(() => {
          expect(getByTestId('test-unAccessiblePoliciesCallout'));
        });
        clickOnPolicy();

        expect(handleOnChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ tags: ['policy:321', 'policy:abc123'] })
        );
      });
    });
  });
});
