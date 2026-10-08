/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { AutomationDetailFlyout } from './automation_detail_flyout';
import {
  useAutomationRunsInRange,
  useToggleAutomation,
  useUpdateAutomation,
} from '../hooks/use_automations';
import { useKibana } from '../../hooks/use_kibana';
import type { Automation } from '../hooks/use_automations';

jest.mock('../hooks/use_automations', () => ({
  useAutomationRunsInRange: jest.fn(),
  useToggleAutomation: jest.fn(),
  useUpdateAutomation: jest.fn(),
}));
jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const automation = {
  id: 'automation-1',
  name: 'Alert triage',
  isEnabled: true,
  tags: [],
  trigger: { rows: [{ kind: 'alert' }] },
  execution: { reasoningMode: 'investigate' },
  completion: {},
  runtime: { dailyDispatchLimit: 20 },
  author: 'alice',
} as unknown as Automation;

const runRange = {
  startedAfter: '2026-01-01T00:00:00.000Z',
  startedBefore: '2026-01-02T00:00:00.000Z',
};

describe('AutomationDetailFlyout edit lifecycle', () => {
  const onClose = jest.fn();
  const mutate = jest.fn();
  const navigateToUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mutate.mockReset();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { navigateToUrl },
        http: { basePath: { prepend: (path: string) => path } },
        charts: { theme: { useChartsBaseTheme: () => ({}), useSparklineOverrides: () => ({}) } },
      },
    });
    (useAutomationRunsInRange as jest.Mock).mockReturnValue({
      data: { runs: [], total: 0 },
      isLoading: false,
    });
    (useToggleAutomation as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useUpdateAutomation as jest.Mock).mockReturnValue({ mutate, isLoading: false });
  });

  const renderFlyout = ({ canManage = true, usedToday = 0 } = {}) => {
    const history = createMemoryHistory({ initialEntries: ['/automations/automation-1'] });
    render(
      <I18nProvider>
        <Router history={history}>
          <AutomationDetailFlyout
            automations={[automation]}
            automation={automation}
            canManage={canManage}
            usedToday={usedToday}
            runRange={runRange}
            rangeLabel="Last 24 hours"
            onClose={onClose}
            onClone={jest.fn()}
            onDelete={jest.fn()}
          />
        </Router>
      </I18nProvider>
    );
    return history;
  };

  const startEditing = () => fireEvent.click(screen.getByTestId('automationEditButton'));
  const renameTo = (name: string) =>
    fireEvent.change(screen.getByTestId('automationName'), { target: { value: name } });

  it('saves the edited name and leaves edit mode after a successful save', () => {
    mutate.mockImplementation((_variables, { onSuccess }) => onSuccess());
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationSaveButton'));

    expect(mutate).toHaveBeenCalledWith(
      { id: 'automation-1', body: expect.objectContaining({ name: 'Renamed' }) },
      expect.any(Object)
    );
    expect(screen.getByTestId('automationEditButton')).toBeInTheDocument();
  });

  it('stays in edit mode with the changes when the save fails', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationSaveButton'));

    expect(screen.getByTestId('automationSaveButton')).toBeInTheDocument();
    expect(screen.getByTestId('automationName')).toHaveValue('Renamed');
  });

  it('cancels editing without saving', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCancelEditButton'));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('automationEditButton')).toBeInTheDocument();
  });

  it('closes without confirmation when nothing changed', () => {
    renderFlyout();

    startEditing();
    fireEvent.click(screen.getByTestId('automationCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('asks before closing with unsaved changes and keeps editing on cancel', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCloseButton'));

    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByTestId('automationName')).toHaveValue('Renamed');
  });

  it('closes after discarding unsaved changes', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCloseButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks route changes with unsaved changes and replays the app path without its prefix', () => {
    const history = renderFlyout();

    startEditing();
    renameTo('Renamed');
    act(() => history.push('/app/nightshift/automations'));

    expect(history.location.pathname).toBe('/automations/automation-1');
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(history.location.pathname).toBe('/automations');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opens another app after discarding unsaved changes', () => {
    const history = renderFlyout();

    startEditing();
    renameTo('Renamed');
    act(() => history.push('/app/discover'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(navigateToUrl).toHaveBeenCalledWith('/app/discover');
    expect(history.location.pathname).toBe('/automations/automation-1');
  });

  it.each([
    [true, 1],
    [false, 0],
  ])(
    'with manage access %s, shows %s Raise limit actions at the daily limit',
    (canManage, count) => {
      renderFlyout({ canManage, usedToday: 20 });

      expect(screen.queryAllByText(/Raise limit/)).toHaveLength(count);
    }
  );
});
