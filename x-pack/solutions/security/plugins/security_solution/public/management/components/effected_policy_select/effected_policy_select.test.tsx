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
import { allFleetHttpMocks } from '../../mocks';
import { policySelectorMocks } from '../policy_selector/mocks';

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

describe('when using EffectedPolicySelect component', () => {
  let mockedContext: AppContextTestRender;
  let componentProps: EffectedPolicySelectProps;
  let handleOnChange: jest.MockedFunction<EffectedPolicySelectProps['onChange']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let render: (
    props?: Partial<EffectedPolicySelectProps>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let policyId: string;
  // Note: testUtils will only be set after render()
  let policySelectorTestUtils: ReturnType<typeof policySelectorMocks.getTestHelpers>;

  let resetHTMLElementOffsetWidth: () => void;

  beforeAll(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
  });

  afterAll(() => resetHTMLElementOffsetWidth());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = allFleetHttpMocks(mockedContext.coreStart.http);
    handleOnChange = jest.fn((updatedArtifact) => {
      componentProps.item = updatedArtifact;
      renderResult.rerender(<EffectedPolicySelect {...componentProps} />);
    });

    policyId = apiMocks.responseProvider.packagePolicies().items[0].id;

    // Default props
    componentProps = {
      item: new ExceptionsListItemGenerator('seed').generateTrustedApp({
        tags: [GLOBAL_ARTIFACT_TAG],
      }),
      onChange: handleOnChange,
      'data-test-subj': 'test',
    };

    render = async (
      props: Partial<EffectedPolicySelectProps> = {}
    ): Promise<ReturnType<AppContextTestRender['render']>> => {
      componentProps = {
        ...componentProps,
        ...props,
      };
      renderResult = mockedContext.render(<EffectedPolicySelect {...componentProps} />);
      policySelectorTestUtils = policySelectorMocks.getTestHelpers(
        `${componentProps['data-test-subj']!}-policiesSelector`,
        renderResult
      );

      return renderResult;
    };

    (useLicenseMock() as jest.Mocked<LicenseService>).isPlatinumPlus.mockReturnValue(true);
  });

  afterEach(() => {
    handleOnChange.mockClear();
  });

  const clickOnGlobalButton = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId('test-global'));
    });
  };

  const clickOnPerPolicyButton = () => {
    act(() => {
      fireEvent.click(renderResult.getByTestId('test-perPolicy'));
    });
  };

  it('should display button group with Global and Per-Policy choices', async () => {
    const { getByTestId } = await render();

    expect(getByTestId('test-global').textContent).toEqual('Global');
    expect(getByTestId('test-perPolicy').textContent).toEqual('Per Policy');
  });

  it('should show Global as current selection when artifact is global', async () => {
    const { getByTestId } = await render();

    expect(getByTestId('test-global').getAttribute('aria-pressed')).toEqual('true');
  });

  it('should show Per Policy as current selection when artifact is per-policy', async () => {
    componentProps.item.tags = [];
    const { getByTestId } = await render();

    expect(getByTestId('test-perPolicy').getAttribute('aria-pressed')).toEqual('true');
  });

  it('should hide policy selection area when artifact is global', async () => {
    const { queryByTestId } = await render();
    expect(queryByTestId('test-policiesSelector')).toBeNull();
  });

  it('should show policy items when user clicks per-policy', async () => {
    const { getByTestId } = await render();
    clickOnPerPolicyButton();
    await policySelectorTestUtils.waitForDataToLoad();

    expect(getByTestId('test-policiesSelector')).not.toBeNull();
  });

  it('should display custom description', async () => {
    componentProps.description = 'custom here';
    const { getByTestId } = await render();

    expect(getByTestId('test-description').textContent).toEqual('custom here');
  });

  it('should show button group as disabled', async () => {
    componentProps.disabled = true;
    const { getByTestId } = await render();

    expect((getByTestId('test-byPolicyGlobalButtonGroup') as HTMLFieldSetElement).disabled).toEqual(
      true
    );
  });

  it('should call onChange when artifact is set to Per-Policy', async () => {
    await render();
    clickOnPerPolicyButton();
    await policySelectorTestUtils.waitForDataToLoad();

    expect(handleOnChange).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  it('should call onChange when Per Policy artifact is set to Global', async () => {
    componentProps.item.tags = [];
    await render();
    clickOnGlobalButton();

    expect(handleOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [GLOBAL_ARTIFACT_TAG] })
    );
  });

  it('should call onChange when policy selection changes', async () => {
    componentProps.item.tags = [];
    await render();
    await policySelectorTestUtils.waitForDataToLoad();
    policySelectorTestUtils.clickOnPolicy(policyId);

    expect(handleOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [buildPerPolicyTag(policyId)] })
    );
  });

  describe('and when license downgrades below Platinum', () => {
    let policyIdList: string[];

    beforeEach(() => {
      (useLicenseMock() as jest.Mocked<LicenseService>).isPlatinumPlus.mockReturnValue(false);
      componentProps.item.tags = [buildPerPolicyTag(policyId)];

      policyIdList = apiMocks.responseProvider.packagePolicies().items.map((policy) => policy.id);
    });

    it('should maintain policy assignments but disable the ability to select/unselect policies', async () => {
      await render();
      await policySelectorTestUtils.waitForDataToLoad();

      expect(policySelectorTestUtils.isPolicySelected(policyId)).toBe(true);

      policyIdList.forEach((id) => {
        expect(policySelectorTestUtils.isPolicyDisabled(id)).toBe(true);
      });
    });

    it("should allow the user to select 'Global' in the edit option", async () => {
      const { getByTestId } = await render();
      await policySelectorTestUtils.waitForDataToLoad();

      act(() => {
        fireEvent.click(getByTestId('test-global'));
      });

      expect(componentProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [GLOBAL_ARTIFACT_TAG] })
      );
    });
  });

  describe('and space awareness is enabled', () => {
    const unAccessiblePolicyId = 'policy-321-not-in-space';

    beforeEach(() => {
      mockedContext.setExperimentalFlag({ endpointManagementSpaceAwarenessEnabled: true });
      componentProps.item.tags = [buildPerPolicyTag(unAccessiblePolicyId)];
      apiMocks.responseProvider.bulkPackagePolicies.mockReturnValue({
        items: [],
      });
    });

    it('should display un-accessible policies in a group and disabled', async () => {
      const { getByTestId } = await render();
      await policySelectorTestUtils.waitForDataToLoad();

      expect(getByTestId('test-unaccessibleGroupLabel')).toBeTruthy();
      expect(getByTestId(`test-unAccessiblePolicy-${unAccessiblePolicyId}`)).toBeTruthy();
      expect(
        (
          getByTestId(
            `${policySelectorTestUtils.testIds.root}-test-unAccessiblePolicy-${unAccessiblePolicyId}-checkbox`
          ) as HTMLInputElement
        ).disabled
      ).toBe(true);
    });

    it('should display count of policies assigned to artifact that are not accessible in active space', async () => {
      const { getByTestId } = await render();

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
      const { getByTestId } = await render();

      expect((getByTestId('test-global') as HTMLButtonElement).disabled).toBe(true);
    });

    it('should preserve assignment to policies not currently accessible in active space', async () => {
      const { getByTestId } = await render();
      await waitFor(() => {
        expect(getByTestId('test-unAccessiblePoliciesCallout'));
      });
      await policySelectorTestUtils.waitForDataToLoad();
      policySelectorTestUtils.clickOnPolicy(policyId);

      expect(handleOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tags: [buildPerPolicyTag(policyId), buildPerPolicyTag(unAccessiblePolicyId)],
        })
      );
    });
  });
});
