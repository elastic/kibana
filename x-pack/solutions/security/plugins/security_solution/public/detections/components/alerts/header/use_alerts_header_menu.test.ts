/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { GO_TO_RULES_MENU_ITEM_TEST_ID, useAlertsHeaderMenu } from './use_alerts_header_menu';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../app/types';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: jest.fn(),
}));

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
const mockUseGetSecuritySolutionUrl = useGetSecuritySolutionUrl as jest.Mock;

const doMockRulesPrivileges = (read: boolean) => {
  mockUseUserPrivileges.mockReturnValue(
    getUserPrivilegesMockDefaultValue({
      rulesPrivileges: {
        ...getUserPrivilegesMockDefaultValue().rulesPrivileges,
        rules: { read, edit: false },
      },
    })
  );
};

describe('useAlertsHeaderMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetSecuritySolutionUrl.mockReturnValue(
      jest.fn(({ deepLinkId }: { deepLinkId: SecurityPageName }) => `/${deepLinkId}`)
    );
  });

  it('surfaces "Manage rules" as the primary action when the user can read rules', () => {
    doMockRulesPrivileges(true);

    const { result } = renderHook(() => useAlertsHeaderMenu());

    expect(result.current.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'manageRules',
        href: `/${SecurityPageName.rules}`,
        testId: GO_TO_RULES_MENU_ITEM_TEST_ID,
      })
    );
  });

  it('omits the primary action when the user cannot read rules', () => {
    doMockRulesPrivileges(false);

    const { result } = renderHook(() => useAlertsHeaderMenu());

    expect(result.current.primaryActionItem).toBeUndefined();
  });
});
