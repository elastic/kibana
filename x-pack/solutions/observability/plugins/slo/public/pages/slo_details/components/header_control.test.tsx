/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Capabilities } from '@kbn/core/public';
import { buildSlo } from '../../../data/slo/slo';
import { useActionModal } from '../../../context/action_modal';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { render } from '../../../utils/test_helper';
import { HeaderControl } from './header_control';
import { useGetQueryParams } from '../hooks/use_get_query_params';
import { useSloActions } from '../hooks/use_slo_actions';

jest.mock('../../../context/action_modal');
jest.mock('../../../hooks/use_fetch_rules_for_slo');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_permissions');
jest.mock('../hooks/use_get_query_params');
jest.mock('../hooks/use_slo_actions');

const useActionModalMock = useActionModal as jest.Mock;
const useFetchRulesForSloMock = useFetchRulesForSlo as jest.Mock;
const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const useGetQueryParamsMock = useGetQueryParams as jest.Mock;
const useSloActionsMock = useSloActions as jest.Mock;

const mockTriggerAction = jest.fn();
const mockNavigateToUrl = jest.fn();
const mockNavigateToRules = jest.fn();

const mockCapabilities = {
  apm: { show: true },
} as unknown as Capabilities;

const mockServices = {
  observabilityShared: {
    config: {
      unsafe: {
        investigativeExperienceEnabled: true,
      },
    },
  },
  application: {
    navigateToUrl: mockNavigateToUrl,
    capabilities: mockCapabilities,
  },
  http: {
    basePath: {
      prepend: (url: string) => url,
    },
  },
  triggersActionsUi: {
    ruleTypeRegistry: {},
    actionTypeRegistry: {},
  },
};

// Helper function to create query params mock with overrides
const createQueryParamsMock = (
  overrides: Partial<{
    isDeletingSlo: boolean;
    isResettingSlo: boolean;
    isEnablingSlo: boolean;
    isDisablingSlo: boolean;
    isAddingToCase: boolean;
  }> = {}
) => ({
  isDeletingSlo: false,
  isResettingSlo: false,
  isEnablingSlo: false,
  isDisablingSlo: false,
  isAddingToCase: false,
  removeDeleteQueryParam: jest.fn(),
  removeResetQueryParam: jest.fn(),
  removeEnableQueryParam: jest.fn(),
  removeDisableQueryParam: jest.fn(),
  removeAddToCaseQueryParam: jest.fn(),
  ...overrides,
});

describe('HeaderControl', () => {
  const mockSlo = buildSlo({ enabled: true });

  beforeEach(() => {
    jest.clearAllMocks();

    useActionModalMock.mockReturnValue({
      triggerAction: mockTriggerAction,
    });

    useFetchRulesForSloMock.mockReturnValue({
      data: { [mockSlo.id]: [] },
      refetchRules: jest.fn(),
    });

    useKibanaMock.mockReturnValue({
      services: mockServices,
    });

    usePermissionsMock.mockReturnValue({
      data: { hasAllWriteRequested: true },
    });

    useGetQueryParamsMock.mockReturnValue(createQueryParamsMock());

    useSloActionsMock.mockReturnValue({
      handleNavigateToRules: mockNavigateToRules,
      sloEditUrl: '/edit-slo-url',
      remoteDeleteUrl: null,
      remoteResetUrl: null,
      remoteEnableUrl: null,
      remoteDisableUrl: null,
      remoteAddToCaseUrl: null,
    });
  });

  describe('Basic Rendering', () => {
    it('renders actions button and opens popover on click', async () => {
      render(<HeaderControl slo={mockSlo} />);

      const actionsButton = screen.getByTestId('o11yHeaderControlActionsButton');
      expect(actionsButton).toBeInTheDocument();

      fireEvent.click(actionsButton);

      await waitFor(() => {
        expect(screen.getByTestId('sloDetailsHeaderControlPopover')).toBeInTheDocument();
      });
    });

    it('shows disable option for enabled SLO', async () => {
      const enabledSlo = buildSlo({ enabled: true });
      render(<HeaderControl slo={enabledSlo} />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('sloActionsDisable')).toBeInTheDocument();
        expect(screen.queryByTestId('sloActionsEnable')).not.toBeInTheDocument();
      });
    });

    it('shows enable option for disabled SLO', async () => {
      const disabledSlo = buildSlo({ enabled: false });
      render(<HeaderControl slo={disabledSlo} />);

      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('sloActionsEnable')).toBeInTheDocument();
        expect(screen.queryByTestId('sloActionsDisable')).not.toBeInTheDocument();
      });
    });
  });

  describe('Permission-Based Rendering', () => {
    it('enables actions when user has write permissions', async () => {
      usePermissionsMock.mockReturnValue({
        data: { hasAllWriteRequested: true },
      });

      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverEdit')).not.toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverDelete')).not.toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverClone')).not.toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverReset')).not.toHaveAttribute(
          'disabled'
        );
      });
    });

    it('disables actions when user lacks write permissions', async () => {
      usePermissionsMock.mockReturnValue({
        data: { hasAllWriteRequested: false },
      });

      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverEdit')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverDelete')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverClone')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverReset')).toHaveAttribute(
          'disabled'
        );
      });
    });
  });

  describe('Action Triggers', () => {
    beforeEach(() => {
      usePermissionsMock.mockReturnValue({
        data: { hasAllWriteRequested: true },
      });
    });

    it('triggers clone action when clone menu item is clicked', async () => {
      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const cloneItem = screen.getByTestId('sloDetailsHeaderControlPopoverClone');
        expect(cloneItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloDetailsHeaderControlPopoverClone'));

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'clone',
        item: mockSlo,
      });
    });

    it('triggers delete action when delete menu item is clicked', async () => {
      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const deleteItem = screen.getByTestId('sloDetailsHeaderControlPopoverDelete');
        expect(deleteItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloDetailsHeaderControlPopoverDelete'));

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'delete',
        item: mockSlo,
        onConfirm: expect.any(Function),
      });
    });

    it('triggers reset action when reset menu item is clicked', async () => {
      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const resetItem = screen.getByTestId('sloDetailsHeaderControlPopoverReset');
        expect(resetItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloDetailsHeaderControlPopoverReset'));

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'reset',
        item: mockSlo,
        onConfirm: expect.any(Function),
      });
    });

    it('triggers disable action when disable menu item is clicked for enabled SLO', async () => {
      const enabledSlo = buildSlo({ enabled: true });
      render(<HeaderControl slo={enabledSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const disableItem = screen.getByTestId('sloActionsDisable');
        expect(disableItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloActionsDisable'));

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'disable',
        item: enabledSlo,
        onConfirm: expect.any(Function),
      });
    });

    it('triggers enable action when enable menu item is clicked for disabled SLO', async () => {
      const disabledSlo = buildSlo({ enabled: false });
      render(<HeaderControl slo={disabledSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const enableItem = screen.getByTestId('sloActionsEnable');
        expect(enableItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloActionsEnable'));

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'enable',
        item: disabledSlo,
        onConfirm: expect.any(Function),
      });
    });
  });

  describe('Query Parameter Effects', () => {
    it('triggers delete action on mount when isDeletingSlo is true', () => {
      useGetQueryParamsMock.mockReturnValue(createQueryParamsMock({ isDeletingSlo: true }));

      render(<HeaderControl slo={mockSlo} />);

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'delete',
        item: mockSlo,
        onConfirm: expect.any(Function),
      });
    });

    it('triggers reset action on mount when isResettingSlo is true', () => {
      useGetQueryParamsMock.mockReturnValue(createQueryParamsMock({ isResettingSlo: true }));

      render(<HeaderControl slo={mockSlo} />);

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'reset',
        item: mockSlo,
      });
    });

    it('triggers enable action on mount when isEnablingSlo is true', () => {
      useGetQueryParamsMock.mockReturnValue(createQueryParamsMock({ isEnablingSlo: true }));

      render(<HeaderControl slo={mockSlo} />);

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'enable',
        item: mockSlo,
      });
    });

    it('triggers disable action on mount when isDisablingSlo is true', () => {
      useGetQueryParamsMock.mockReturnValue(createQueryParamsMock({ isDisablingSlo: true }));

      render(<HeaderControl slo={mockSlo} />);

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'disable',
        item: mockSlo,
      });
    });

    it('triggers add_to_case action on mount when isAddingToCase is true', () => {
      useGetQueryParamsMock.mockReturnValue(createQueryParamsMock({ isAddingToCase: true }));

      render(<HeaderControl slo={mockSlo} />);

      expect(mockTriggerAction).toHaveBeenCalledWith({
        type: 'add_to_case',
        item: mockSlo,
      });
    });
  });

  describe('Remote SLO Handling', () => {
    it('disables actions for remote SLO with undefined kibana URL', async () => {
      const remoteSlo = buildSlo({
        remote: {
          kibanaUrl: '',
          remoteName: 'remote-cluster',
        },
      });

      render(<HeaderControl slo={remoteSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverEdit')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverDelete')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverClone')).toHaveAttribute(
          'disabled'
        );
        expect(screen.getByTestId('sloDetailsHeaderControlPopoverReset')).toHaveAttribute(
          'disabled'
        );
      });
    });

    it('opens external URL when remote URLs are provided', async () => {
      const mockOpen = jest.spyOn(window, 'open').mockImplementation();

      useSloActionsMock.mockReturnValue({
        handleNavigateToRules: mockNavigateToRules,
        sloEditUrl: '/edit-slo-url',
        remoteDeleteUrl: 'https://remote-kibana/delete',
        remoteResetUrl: null,
        remoteEnableUrl: null,
        remoteDisableUrl: null,
        remoteAddToCaseUrl: null,
      });

      render(<HeaderControl slo={mockSlo} />);
      fireEvent.click(screen.getByTestId('o11yHeaderControlActionsButton'));

      await waitFor(() => {
        const deleteItem = screen.getByTestId('sloDetailsHeaderControlPopoverDelete');
        expect(deleteItem).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('sloDetailsHeaderControlPopoverDelete'));

      expect(mockOpen).toHaveBeenCalledWith('https://remote-kibana/delete', '_blank');
      expect(mockTriggerAction).not.toHaveBeenCalled();

      mockOpen.mockRestore();
    });
  });
});
