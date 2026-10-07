/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { INFRA_EBT_ACTIONS, INFRA_EBT_DETAILS } from '../../../common/ebt_constants';
import {
  getAnalyzeInMlMenuItem,
  getManageMlJobsPrimaryAction,
  getRecreateMlJobPrimaryAction,
  LOGS_APP_MENU_ORDER,
} from './menu_items';
import { useLogsAppHeaderMenu } from './use_logs_app_header_menu';

interface MenuNode {
  id: string;
  ebt?: { action: string; detail?: string };
  items?: MenuNode[];
}

function collectEbt(
  items: AppHeaderMenu['items'] | MenuNode[] | undefined
): Array<{ id: string; action: string; detail?: string }> {
  const collected: Array<{ id: string; action: string; detail?: string }> = [];

  for (const item of items ?? []) {
    if (item.ebt) {
      collected.push({
        id: item.id,
        action: item.ebt.action,
        ...(item.ebt.detail !== undefined ? { detail: item.ebt.detail } : {}),
      });
    }

    if ('items' in item && item.items) {
      collected.push(...collectEbt(item.items));
    }
  }

  return collected;
}

const mockGetRedirectUrl = jest.fn(() => '/app/observabilityOnboarding');
const mockNavigateToUrl = jest.fn();
const mockCapabilities = {
  logs: { save: true },
};
const mockLogView = {
  isPersistedLogView: true,
};

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      application: { capabilities: mockCapabilities, navigateToUrl: mockNavigateToUrl },
      observability: {
        useRulesLink: () => ({ href: '/app/observability/alerts/rules' }),
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
    },
  }),
}));

jest.mock('@kbn/logs-shared-plugin/public', () => ({
  useLogViewContext: () => mockLogView,
}));

jest.mock('../../../alerting/log_threshold/components/alert_flyout', () => ({
  AlertFlyout: ({ visible }: { visible: boolean }) =>
    visible ? <div data-test-subj="logsAlertFlyout" /> : null,
}));

function findItem(
  items: AppHeaderMenu['items'],
  id: string
): NonNullable<AppHeaderMenu['items']>[number] | undefined {
  return items?.find((item) => item.id === id);
}

describe('useLogsAppHeaderMenu', () => {
  beforeEach(() => {
    mockGetRedirectUrl.mockClear();
    mockNavigateToUrl.mockClear();
    mockCapabilities.logs.save = true;
    mockLogView.isPersistedLogView = true;
  });

  it('builds Alerts and Add data as regular items', () => {
    const { result } = renderHook(() => useLogsAppHeaderMenu());
    const { menu } = result.current;

    expect(findItem(menu.items, 'alerts')).toEqual(
      expect.objectContaining({
        id: 'alerts',
        testId: 'logs-alerts-and-rules',
        popoverTestId: 'logs-alert-menu',
        order: LOGS_APP_MENU_ORDER.alerts,
        ebt: { action: INFRA_EBT_ACTIONS.OPEN_ALERTS_MENU },
      })
    );
    expect(findItem(menu.items, 'addData')).toEqual(
      expect.objectContaining({
        id: 'addData',
        href: '/app/observabilityOnboarding',
        run: expect.any(Function),
        order: LOGS_APP_MENU_ORDER.addData,
        ebt: {
          action: INFRA_EBT_ACTIONS.ADD_DATA,
          detail: INFRA_EBT_DETAILS.ADD_DATA_HOST,
        },
      })
    );
    expect(menu.primaryActionItem).toBeUndefined();
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: 'host' });
  });

  it('keeps Analyze in ML ahead of Alerts and Add data', () => {
    const extraItems = [
      getAnalyzeInMlMenuItem({ href: '/app/ml', navigateToUrl: mockNavigateToUrl }),
    ];
    const { result } = renderHook(() => useLogsAppHeaderMenu({ extraItems }));
    const { menu } = result.current;

    expect(findItem(menu.items, 'analyzeInMl')).toEqual(
      expect.objectContaining({
        id: 'analyzeInMl',
        href: '/app/ml',
        run: expect.any(Function),
        testId: 'infraAnalyzeInMlButtonAnalyzeInMlButton',
        order: LOGS_APP_MENU_ORDER.analyzeInMl,
        ebt: { action: INFRA_EBT_ACTIONS.ANALYZE_IN_ML },
      })
    );
    const analyzeInMl = findItem(menu.items, 'analyzeInMl');
    const analyzeInMlRun = analyzeInMl && 'run' in analyzeInMl ? analyzeInMl.run : undefined;
    analyzeInMlRun?.();
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/ml');

    expect(findItem(menu.items, 'analyzeInMl')?.order).toBeLessThan(
      findItem(menu.items, 'alerts')?.order ?? Number.POSITIVE_INFINITY
    );
    expect(findItem(menu.items, 'alerts')?.order).toBeLessThan(
      findItem(menu.items, 'addData')?.order ?? Number.POSITIVE_INFINITY
    );
  });

  it('uses Manage ML Jobs as the primary action', () => {
    const onClick = jest.fn();
    const { result } = renderHook(() =>
      useLogsAppHeaderMenu({
        primaryActionItem: getManageMlJobsPrimaryAction(onClick),
      })
    );

    expect(result.current.menu.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'manageMlJobs',
        testId: 'infraManageJobsButtonManageMlJobsButton',
        ebt: { action: INFRA_EBT_ACTIONS.MANAGE_ML_JOBS },
      })
    );
  });

  it('disables Recreate ML job without setup capabilities', () => {
    const { result } = renderHook(() =>
      useLogsAppHeaderMenu({
        primaryActionItem: getRecreateMlJobPrimaryAction({
          hasSetupCapabilities: false,
          onClick: jest.fn(),
        }),
      })
    );

    expect(result.current.menu.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'recreateMlJob',
        testId: 'infraCreateJobButtonButton',
        disableButton: true,
        ebt: { action: INFRA_EBT_ACTIONS.RECREATE_ML_JOB },
      })
    );
  });

  it('disables create rule for read-only users', () => {
    mockCapabilities.logs.save = false;
    const { result } = renderHook(() => useLogsAppHeaderMenu());
    const alerts = findItem(result.current.menu.items, 'alerts');

    expect(alerts && 'items' in alerts ? alerts.items?.map((item) => item.id) : []).toEqual([
      'createRule',
      'manageRules',
    ]);
    expect(alerts && 'items' in alerts ? alerts.items?.[0] : undefined).toEqual(
      expect.objectContaining({
        id: 'createRule',
        disableButton: true,
        tooltipTitle: 'Read only',
      })
    );
  });

  it('disables create rule for inline log views', () => {
    mockLogView.isPersistedLogView = false;
    const { result } = renderHook(() => useLogsAppHeaderMenu());
    const alerts = findItem(result.current.menu.items, 'alerts');

    expect(alerts && 'items' in alerts ? alerts.items?.[0] : undefined).toEqual(
      expect.objectContaining({
        id: 'createRule',
        disableButton: true,
        tooltipTitle: 'Inline Log View',
      })
    );
  });

  it('opens the log threshold flyout from create rule', async () => {
    const { result, rerender } = renderHook(() => useLogsAppHeaderMenu());
    const alerts = findItem(result.current.menu.items, 'alerts');
    const createRule = alerts && 'items' in alerts ? alerts.items?.[0] : undefined;

    const createRuleRun = createRule && 'run' in createRule ? createRule.run : undefined;
    expect(typeof createRuleRun).toBe('function');
    act(() => {
      createRuleRun?.();
    });
    rerender();

    expect(
      await render(result.current.flyouts).findByTestId('logsAlertFlyout')
    ).toBeInTheDocument();
  });

  it('sets ebt.action on every default menu item', () => {
    const { result } = renderHook(() => useLogsAppHeaderMenu());
    const collected = collectEbt(result.current.menu.items);

    expect(collected).toEqual([
      { id: 'alerts', action: INFRA_EBT_ACTIONS.OPEN_ALERTS_MENU },
      { id: 'createRule', action: INFRA_EBT_ACTIONS.CREATE_LOG_THRESHOLD_RULE },
      { id: 'manageRules', action: INFRA_EBT_ACTIONS.MANAGE_RULES },
      {
        id: 'addData',
        action: INFRA_EBT_ACTIONS.ADD_DATA,
        detail: INFRA_EBT_DETAILS.ADD_DATA_HOST,
      },
    ]);
  });
});
