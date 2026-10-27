/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import moment from 'moment';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import type { ExternalRuleSource } from '../../../../../common/api/detection_engine';
import { DuplicateOptions } from '../../../../../common/detection_engine/rule_management/constants';
import { APP_UI_ID } from '../../../../../common/constants';
import { SecurityPageName } from '../../../../app/types';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { getRulesUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import { useDownloadExportedRules } from '../../../rule_management/logic/bulk_actions/use_download_exported_rules';
import { useScheduleRuleRun } from '../../../rule_gaps/logic/use_schedule_rule_run';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { useRuleDetailsMenu } from './use_rule_details_menu';

jest.mock('../../../../common/components/user_privileges');
jest.mock(
  '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context'
);
jest.mock('../../../rule_management/logic/bulk_actions/use_execute_bulk_action');
jest.mock('../../../rule_management/logic/bulk_actions/use_bulk_export');
jest.mock('../../../rule_management/logic/bulk_actions/use_download_exported_rules');
jest.mock('../../../rule_gaps/logic/use_schedule_rule_run');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: jest.fn(),
    useUiSetting$: jest.fn(),
  };
});
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: () => () => '/app/security/rules',
}));
jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));
jest.mock('./use_add_rule_to_chat_menu_item', () => ({
  useAddRuleToChatMenuItem: () => undefined,
}));

const confirmDeletion = jest.fn(async () => false);
const refreshRule = jest.fn();
const executeBulkAction = jest.fn();
const bulkExport = jest.fn();
const downloadExportedRules = jest.fn();
const scheduleRuleRun = jest.fn();
const navigateToApp = jest.fn();
const reportEvent = jest.fn();
const openCustomizationsRevertFlyout = jest.fn();

const getMenuProps = (
  rule: ReturnType<typeof mockRule> | null = mockRule('rule-id'),
  ruleLoading = false,
  overrides: Partial<Parameters<typeof useRuleDetailsMenu>[0]> = {}
) => ({
  rule,
  ruleId: 'rule-id',
  ruleLoading,
  isExistingRule: true,
  hasActionsPrivileges: true,
  refreshRule,
  snoozeMenuItem: {
    id: 'snoozeRule',
    label: 'Set snooze',
    iconType: 'bell' as const,
    overflow: true as const,
    run: jest.fn(),
    testId: 'rules-details-snooze-rule',
  },
  showBulkDuplicateExceptionsConfirmation: async () => null,
  showManualRuleRunConfirmation: async () => null,
  confirmDeletion,
  ...overrides,
});

const RuleMenu = ({
  rule = mockRule('rule-id'),
  ruleLoading = false,
}: {
  rule?: ReturnType<typeof mockRule>;
  ruleLoading?: boolean;
}) => {
  const menu = useRuleDetailsMenu(getMenuProps(rule, ruleLoading));
  return <SecurityAppHeader title="Rule" menu={menu} />;
};

const renderHeader = (rule?: ReturnType<typeof mockRule>, ruleLoading?: boolean) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleMenu rule={rule} ruleLoading={ruleLoading} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

const renderMenuHook = (props = getMenuProps()) =>
  renderHook(() => useRuleDetailsMenu(props), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <TestProviders>
        <MemoryRouter>{children}</MemoryRouter>
      </TestProviders>
    ),
  });

const getMenuItem = (menu: ReturnType<typeof useRuleDetailsMenu>, id: string) =>
  menu.items?.find((item) => item.id === id);

const runMenuItem = async (menu: ReturnType<typeof useRuleDetailsMenu>, id: string) => {
  await act(async () => {
    await getMenuItem(menu, id)?.run?.();
  });
};

const mockPrivileges = (overrides: Record<string, { read: boolean; edit: boolean }> = {}) =>
  (useUserPrivileges as jest.Mock).mockReturnValue({
    ...initialUserPrivilegesState(),
    rulesPrivileges: {
      ...initialUserPrivilegesState().rulesPrivileges,
      rules: { read: true, edit: true },
      manualRun: { read: true, edit: true },
      exceptions: { read: true, edit: true },
      enableDisable: { read: true, edit: true },
      ...overrides,
    },
  });

const customizedPrebuiltRule = () => ({
  ...mockRule('rule-id'),
  rule_source: { type: 'external', is_customized: true } as ExternalRuleSource,
});

describe('rule details app menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
        manualRun: { read: true, edit: true },
        exceptions: { read: true, edit: true },
        enableDisable: { read: true, edit: true },
      },
    });
    (useRuleCustomizationsContext as jest.Mock).mockReturnValue({
      actions: { openCustomizationsRevertFlyout },
      state: { doesBaseVersionExist: true },
    });
    (useExecuteBulkAction as jest.Mock).mockReturnValue({ executeBulkAction });
    (useBulkExport as jest.Mock).mockReturnValue({ bulkExport });
    (useDownloadExportedRules as jest.Mock).mockReturnValue(downloadExportedRules);
    (useScheduleRuleRun as jest.Mock).mockReturnValue({ scheduleRuleRun });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useUiSetting$ as jest.Mock).mockReturnValue([false]);
    (useKibana as jest.Mock).mockImplementation(() => {
      const { useKibana: useActualKibana } = jest.requireActual('../../../../common/lib/kibana');
      const actual = useActualKibana();
      return {
        ...actual,
        services: {
          ...actual.services,
          application: { ...actual.services.application, navigateToApp },
          telemetry: { reportEvent },
        },
      };
    });
  });

  it('shows the edit action and rule actions in the app menu', async () => {
    renderHeader();

    expect(await screen.findByTestId('editRuleSettingsLink')).toBeEnabled();
    await openAppMenuOverflow();
    expect(screen.getByTestId('rules-details-snooze-rule')).toBeInTheDocument();
    expect(screen.getByTestId('rules-details-duplicate-rule')).toBeEnabled();
    expect(screen.getByTestId('rules-details-export-rule')).toBeEnabled();
    expect(screen.getByTestId('rules-details-manual-rule-run')).toBeEnabled();
    expect(screen.getByTestId('rules-details-delete-rule')).toBeEnabled();
  });

  it('disables the actions that require write privileges', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: false },
        manualRun: { read: true, edit: false },
        exceptions: { read: true, edit: false },
        enableDisable: { read: true, edit: false },
      },
    });
    renderHeader();

    expect(await screen.findByTestId('editRuleSettingsLink')).toBeDisabled();
    await openAppMenuOverflow();
    expect(screen.getByTestId('rules-details-duplicate-rule')).toBeDisabled();
    expect(screen.getByTestId('rules-details-manual-rule-run')).toBeDisabled();
    expect(screen.getByTestId('rules-details-delete-rule')).toBeDisabled();
    expect(screen.getByTestId('rules-details-export-rule')).toBeEnabled();
  });

  it('refreshes the rule status from the app menu', async () => {
    renderHeader();
    await openAppMenuOverflow();

    await userEvent.click(screen.getByTestId('ruleLastExecutionStatusRefreshButton'));

    expect(refreshRule).toHaveBeenCalled();
  });

  it('keeps the rule when deletion is cancelled', async () => {
    renderHeader();
    await openAppMenuOverflow();

    await userEvent.click(screen.getByTestId('rules-details-delete-rule'));

    expect(confirmDeletion).toHaveBeenCalled();
    expect(executeBulkAction).not.toHaveBeenCalled();
  });

  it('shows a loading "Refresh status" action while the rule refreshes', async () => {
    renderHeader(undefined, true);
    await openAppMenuOverflow();

    expect(screen.getByTestId('ruleLastExecutionStatusRefreshButton')).toBeDisabled();
  });

  describe('"Refresh status" feedback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const getRefreshItem = (menu: ReturnType<typeof useRuleDetailsMenu>) =>
      getMenuItem(menu, 'refreshRuleStatus');

    it('keeps the loading state visible for a minimum time even when the refresh is instant', () => {
      const { result } = renderMenuHook();
      expect(getRefreshItem(result.current)?.isLoading).toBe(false);

      act(() => {
        getRefreshItem(result.current)?.run?.();
      });

      expect(refreshRule).toHaveBeenCalledTimes(1);
      expect(getRefreshItem(result.current)?.isLoading).toBe(true);
      expect(getRefreshItem(result.current)?.disableButton).toBe(true);

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(getRefreshItem(result.current)?.isLoading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(getRefreshItem(result.current)?.isLoading).toBe(false);
      expect(getRefreshItem(result.current)?.disableButton).toBe(false);
    });
  });

  describe('duplicate rule', () => {
    const createdRuleResult = { attributes: { results: { created: [{ id: 'copy-id' }] } } };

    it.each([
      [
        DuplicateOptions.withExceptions,
        { include_exceptions: true, include_expired_exceptions: true },
      ],
      [
        DuplicateOptions.withExceptionsExcludeExpiredExceptions,
        { include_exceptions: true, include_expired_exceptions: false },
      ],
      [
        DuplicateOptions.withoutExceptions,
        { include_exceptions: false, include_expired_exceptions: true },
      ],
    ])('sends the payload of the "%s" choice and opens the copy', async (choice, payload) => {
      executeBulkAction.mockResolvedValue(createdRuleResult);
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, {
          showBulkDuplicateExceptionsConfirmation: async () => choice,
        })
      );

      await runMenuItem(result.current, 'duplicateRule');

      expect(executeBulkAction).toHaveBeenCalledWith({
        type: BulkActionTypeEnum.duplicate,
        ids: ['rule-id'],
        duplicatePayload: payload,
      });
      expect(goToRuleEditPage).toHaveBeenCalledWith('copy-id', navigateToApp);
    });

    it('does nothing when the exceptions confirmation is cancelled', async () => {
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, {
          showBulkDuplicateExceptionsConfirmation: async () => null,
        })
      );

      await runMenuItem(result.current, 'duplicateRule');

      expect(executeBulkAction).not.toHaveBeenCalled();
      expect(goToRuleEditPage).not.toHaveBeenCalled();
    });

    it('skips the exceptions confirmation and copies without exceptions when the user cannot edit exceptions', async () => {
      mockPrivileges({ exceptions: { read: true, edit: false } });
      executeBulkAction.mockResolvedValue(createdRuleResult);
      const showBulkDuplicateExceptionsConfirmation = jest.fn();
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, { showBulkDuplicateExceptionsConfirmation })
      );

      await runMenuItem(result.current, 'duplicateRule');

      expect(showBulkDuplicateExceptionsConfirmation).not.toHaveBeenCalled();
      expect(executeBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({
          duplicatePayload: { include_exceptions: false, include_expired_exceptions: true },
        })
      );
    });

    it('does not open an edit page when no copy is created', async () => {
      executeBulkAction.mockResolvedValue({ attributes: { results: { created: [] } } });
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, {
          showBulkDuplicateExceptionsConfirmation: async () => DuplicateOptions.withoutExceptions,
        })
      );

      await runMenuItem(result.current, 'duplicateRule');

      expect(goToRuleEditPage).not.toHaveBeenCalled();
    });
  });

  describe('delete rule', () => {
    it('deletes the rule and goes to the rules page once deletion is confirmed', async () => {
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, { confirmDeletion: async () => true })
      );

      await runMenuItem(result.current, 'deleteRule');

      expect(executeBulkAction).toHaveBeenCalledWith({
        type: BulkActionTypeEnum.delete,
        ids: ['rule-id'],
      });
      expect(navigateToApp).toHaveBeenCalledWith(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRulesUrl(),
      });
    });
  });

  describe('manual rule run', () => {
    it('reports the modal telemetry and schedules the run for the chosen time range', async () => {
      const timeRange = { startDate: moment('2026-10-01'), endDate: moment('2026-10-02') };
      const { result } = renderMenuHook(
        getMenuProps(undefined, false, { showManualRuleRunConfirmation: async () => timeRange })
      );

      await runMenuItem(result.current, 'manualRuleRun');

      expect(reportEvent).toHaveBeenCalledWith(ManualRuleRunEventTypes.ManualRuleRunOpenModal, {
        type: 'single',
      });
      expect(scheduleRuleRun).toHaveBeenCalledWith({ ruleIds: ['rule-id'], timeRange });
    });

    it('reports the modal telemetry but schedules no run when the modal is cancelled', async () => {
      const { result } = renderMenuHook();

      await runMenuItem(result.current, 'manualRuleRun');

      expect(reportEvent).toHaveBeenCalledWith(ManualRuleRunEventTypes.ManualRuleRunOpenModal, {
        type: 'single',
      });
      expect(scheduleRuleRun).not.toHaveBeenCalled();
    });

    it('is disabled with an explanation when the rule is disabled', () => {
      const { result } = renderMenuHook(getMenuProps({ ...mockRule('rule-id'), enabled: false }));

      const item = getMenuItem(result.current, 'manualRuleRun');
      expect(item?.disableButton).toBe(true);
      expect(item?.tooltipContent).toBeDefined();
    });
  });

  describe('export rule', () => {
    it('exports the rule and downloads the response', async () => {
      const response = new Blob(['rule']);
      bulkExport.mockResolvedValue(response);
      const { result } = renderMenuHook();

      await runMenuItem(result.current, 'exportRule');

      expect(bulkExport).toHaveBeenCalledWith({ ids: ['rule-id'] });
      expect(downloadExportedRules).toHaveBeenCalledWith(response);
    });

    it('downloads nothing when the export returns no response', async () => {
      bulkExport.mockResolvedValue(undefined);
      const { result } = renderMenuHook();

      await runMenuItem(result.current, 'exportRule');

      expect(downloadExportedRules).not.toHaveBeenCalled();
    });
  });

  describe('revert rule', () => {
    it('is not offered for a custom rule', () => {
      const { result } = renderMenuHook();

      expect(getMenuItem(result.current, 'revertRule')).toBeUndefined();
    });

    it('opens the revert flyout for a customized prebuilt rule', async () => {
      const { result } = renderMenuHook(getMenuProps(customizedPrebuiltRule()));

      expect(getMenuItem(result.current, 'revertRule')?.disableButton).toBe(false);
      await runMenuItem(result.current, 'revertRule');

      expect(openCustomizationsRevertFlyout).toHaveBeenCalled();
    });

    it('is disabled with an explanation when the base version does not exist', () => {
      (useRuleCustomizationsContext as jest.Mock).mockReturnValue({
        actions: { openCustomizationsRevertFlyout },
        state: { doesBaseVersionExist: false },
      });
      const { result } = renderMenuHook(getMenuProps(customizedPrebuiltRule()));

      const item = getMenuItem(result.current, 'revertRule');
      expect(item?.disableButton).toBe(true);
      expect(item?.tooltipContent).toBeDefined();
      expect(item?.tooltipTitle).toBeDefined();
    });
  });

  describe('without a rule', () => {
    it('offers no rule-specific action', () => {
      const { result } = renderMenuHook(getMenuProps(null));

      ['duplicateRule', 'exportRule', 'manualRuleRun', 'revertRule', 'deleteRule'].forEach((id) =>
        expect(getMenuItem(result.current, id)).toBeUndefined()
      );
    });
  });

  describe('rule changes history', () => {
    it('is offered when rule changes history is enabled', () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useUiSetting$ as jest.Mock).mockReturnValue([true]);
      const { result } = renderMenuHook();

      expect(getMenuItem(result.current, 'ruleHistory')).toBeDefined();
    });

    it('is not offered when rule changes history is disabled', () => {
      const { result } = renderMenuHook();

      expect(getMenuItem(result.current, 'ruleHistory')).toBeUndefined();
    });
  });
});
