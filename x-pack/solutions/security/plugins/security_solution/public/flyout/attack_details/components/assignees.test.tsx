/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { Assignees } from './assignees';
import { TestProviders } from '../../../common/mock';
import { useAttackDetailsContext } from '../context';
import { useHeaderData } from '../hooks/use_header_data';
import { useAttackAssigneesContextMenuItems } from '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items';
import { useInvalidateFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttacksPrivileges } from '../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges';
import { useLicense } from '../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';
import { HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID } from '../constants/test_ids';

import {
  USERS_AVATARS_PANEL_TEST_ID,
  USER_AVATAR_ITEM_TEST_ID,
} from '../../../common/components/user_profiles/test_ids';

jest.mock('../context');
jest.mock('../hooks/use_header_data');
jest.mock(
  '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items'
);
jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries');
jest.mock('../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges');
jest.mock('../../../common/hooks/use_license');
jest.mock('../../../common/hooks/use_upselling');
jest.mock('../../../common/components/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: ({ uids }: { uids: Set<string> }) => ({
    data:
      uids.size > 0
        ? [
            {
              uid: 'uid-1',
              enabled: true,
              user: { username: 'user1', full_name: 'User 1' },
              data: {},
            },
          ]
        : undefined,
  }),
}));
jest.mock('../../../common/components/empty_value', () => ({
  getEmptyTagValue: () => '—',
}));

const mockUseAttackDetailsContext = useAttackDetailsContext as jest.MockedFunction<
  typeof useAttackDetailsContext
>;
const mockUseHeaderData = useHeaderData as jest.MockedFunction<typeof useHeaderData>;
const mockUseAttackAssigneesContextMenuItems =
  useAttackAssigneesContextMenuItems as jest.MockedFunction<
    typeof useAttackAssigneesContextMenuItems
  >;
const mockUseInvalidateFindAttackDiscoveries =
  useInvalidateFindAttackDiscoveries as jest.MockedFunction<
    typeof useInvalidateFindAttackDiscoveries
  >;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseUpsellingMessage = useUpsellingMessage as jest.MockedFunction<
  typeof useUpsellingMessage
>;

const mockRefetch = jest.fn();
const mockInvalidateFindAttackDiscoveries = jest.fn();

const defaultContext = {
  attackId: 'attack-123',
  refetch: mockRefetch,
  indexName: 'test-index',
  searchHit: { _index: 'test-index' },
  browserFields: {},
  getFieldsData: jest.fn(),
  dataFormattedForFieldBrowser: [],
} as ReturnType<typeof useAttackDetailsContext>;

const defaultHeaderData = {
  alertIds: ['alert-1', 'alert-2'],
  assignees: ['uid-1'],
} as ReturnType<typeof useHeaderData>;

const defaultMenuItems = {
  items: [{ name: 'Manage assignees', panel: 2, key: 'manage' }],
  panels: [{ id: 2, title: 'Assignees', content: <div data-test-subj="assignees-panel" /> }],
};

const renderAssignees = () =>
  render(
    <TestProviders>
      <Assignees />
    </TestProviders>
  );

describe('Assignees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttackDetailsContext.mockReturnValue(defaultContext);
    mockUseHeaderData.mockReturnValue(defaultHeaderData);
    mockUseAttackAssigneesContextMenuItems.mockReturnValue(defaultMenuItems);
    mockUseInvalidateFindAttackDiscoveries.mockReturnValue(mockInvalidateFindAttackDiscoveries);
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => true,
    } as ReturnType<typeof useLicense>);
    mockUseUpsellingMessage.mockReturnValue(undefined);
  });

  it('passes attacksWithAssignees and onSuccess to useAttackAssigneesContextMenuItems', () => {
    renderAssignees();

    expect(mockUseAttackAssigneesContextMenuItems).toHaveBeenCalledWith(
      expect.objectContaining({
        attacksWithAssignees: [
          {
            attackId: 'attack-123',
            relatedAlertIds: ['alert-1', 'alert-2'],
            assignees: ['uid-1'],
          },
        ],
      })
    );
    const call = mockUseAttackAssigneesContextMenuItems.mock.calls[0][0];
    expect(call.onSuccess).toBeDefined();
    expect(typeof call.closePopover).toBe('function');
  });

  it('onSuccess calls refetch and invalidateFindAttackDiscoveries', () => {
    let capturedOnSuccess: (() => void) | undefined;
    mockUseAttackAssigneesContextMenuItems.mockImplementation((args) => {
      capturedOnSuccess = args.onSuccess;
      return defaultMenuItems;
    });

    renderAssignees();
    expect(capturedOnSuccess).toBeDefined();

    capturedOnSuccess!();

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockInvalidateFindAttackDiscoveries).toHaveBeenCalled();
  });

  it('renders empty state when user has no permission', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: false,
      hasAttackIndexWrite: true,
      loading: false,
    });

    renderAssignees();

    expect(screen.getByTestId('attack-details-flyout-header-assignees-empty')).toBeInTheDocument();
    expect(screen.getByTestId('attack-details-flyout-header-assignees-empty')).toHaveTextContent(
      '—'
    );
    expect(screen.queryByTestId('attack-details-flyout-header-assignees')).not.toBeInTheDocument();
  });

  it('renders empty state when not platinum plus', () => {
    mockUseLicense.mockReturnValue({
      isPlatinumPlus: () => false,
    } as ReturnType<typeof useLicense>);

    renderAssignees();

    expect(screen.getByTestId('attack-details-flyout-header-assignees-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('attack-details-flyout-header-assignees')).not.toBeInTheDocument();
  });

  it('renders assignees block with add button and popover when has permission', () => {
    renderAssignees();

    expect(screen.getByTestId('attack-details-flyout-header-assignees')).toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).not.toBeDisabled();
    expect(
      screen.getByTestId('attack-details-flyout-header-assignees-popover')
    ).toBeInTheDocument();
  });

  it('renders avatars when assignees are provided and user profiles loaded', () => {
    renderAssignees();

    expect(screen.getByTestId(USERS_AVATARS_PANEL_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(USER_AVATAR_ITEM_TEST_ID('user1'))).toBeInTheDocument();
  });

  it('does not render avatars when assignees is empty', () => {
    mockUseHeaderData.mockReturnValue({
      ...defaultHeaderData,
      assignees: [],
    });

    renderAssignees();

    expect(screen.getByTestId('attack-details-flyout-header-assignees')).toBeInTheDocument();
    expect(screen.queryByTestId(USERS_AVATARS_PANEL_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('renders empty state when privileges are loading', () => {
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: true,
    });

    renderAssignees();

    expect(screen.getByTestId('attack-details-flyout-header-assignees-empty')).toBeInTheDocument();
  });
});
