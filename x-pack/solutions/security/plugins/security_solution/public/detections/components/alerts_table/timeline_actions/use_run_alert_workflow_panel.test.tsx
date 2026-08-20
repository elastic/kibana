/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react';
import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import {
  AlertWorkflowsPanel,
  useRunAlertWorkflowPanel,
  RUN_WORKFLOW_PANEL_ID,
  type UseRunAlertWorkflowPanelProps,
} from './use_run_alert_workflow_panel';
import { AlertWorkflowExecutorProvider } from './alert_workflow_executor';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { AlertTableContextMenuItem } from '../types';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import * as i18n from '../translations';

const mockMutate = jest.fn();
const mockUseRunWorkflow = jest.fn(() => ({ mutate: mockMutate }));
const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canReadManagedWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canCancelWorkflowExecution: true,
}));
const mockUseWorkflowsUIEnabledSetting = jest.fn(() => true);
const mockUseWorkflows = jest.fn((_params: unknown) => ({ data: { results: [] } }));
const mockRunWorkflowPanel = jest.fn((_props: unknown) => (
  <div>
    <div data-test-subj="workflow-selector-mock">{'Workflow selector stub'}</div>
    <button data-test-subj="run-workflow-execute-button" type="button">
      {'Run workflow'}
    </button>
  </div>
));
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useKibana: jest.fn(),
  };
});
jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: () => mockUseRunWorkflow(),
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  useWorkflowsUIEnabledSetting: () => mockUseWorkflowsUIEnabledSetting(),
  useWorkflows: (params: unknown) => mockUseWorkflows(params),
  WorkflowSelector: ({ onWorkflowChange }: { onWorkflowChange: (id: string) => void }) => (
    <div data-test-subj="workflow-selector-mock">
      {'Workflow selector'}
      <button
        data-test-subj="select-workflow-option"
        type="button"
        onClick={() => onWorkflowChange('test-workflow-id')}
      >
        {'Select workflow'}
      </button>
    </div>
  ),
  // RunWorkflowPanel now lives in @kbn/workflows-ui.
  // Its full behavior is tested in src/platform/packages/shared/kbn-workflows-ui.
  // This stub covers panel-level rendering assertions only.
  RunWorkflowPanel: (props: unknown) => mockRunWorkflowPanel(props),
}));
jest.mock('../../../../common/components/loader', () => ({
  Loader: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="loader">{children}</div>
  ),
}));

const useKibanaMock = jest.requireMock('@kbn/kibana-react-plugin/public').useKibana as jest.Mock;

const defaultProps: UseRunAlertWorkflowPanelProps = {
  closePopover: jest.fn(),
  ecsRowData: {
    _id: 'alert-123',
    _index: 'alerts-index',
    kibana: {
      alert: {
        workflow_status: ['open'],
      },
    },
  },
};

const createMockKibana = (
  overrides: {
    application?: { navigateToApp: jest.Mock };
    rendering?: object;
  } = {}
) => {
  const { application, rendering = {} } = overrides;
  const baseServices = createStartServicesMock();
  return {
    services: {
      ...baseServices,
      application: {
        ...baseServices.application,
        ...application,
      },
      rendering: rendering || undefined,
    },
  };
};

const renderContextMenu = (
  items: AlertTableContextMenuItem[],
  panels: EuiContextMenuPanelDescriptor[]
) => {
  const panelsToRender = [{ id: 0, items }, ...panels];
  return render(
    <EuiPopover
      aria-label="Context menu"
      isOpen={true}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => {}}
      button={<></>}
    >
      <EuiContextMenu initialPanelId={panels[0]?.id ?? 1} panels={panelsToRender} />
    </EuiPopover>
  );
};

describe('useRunAlertWorkflowPanel', () => {
  beforeEach(() => {
    mockUseRunWorkflow.mockReturnValue({ mutate: mockMutate });
    mockUseWorkflowsCapabilities.mockReturnValue({
      canCreateWorkflow: true,
      canReadWorkflow: true,
      canReadManagedWorkflow: true,
      canUpdateWorkflow: true,
      canDeleteWorkflow: true,
      canExecuteWorkflow: true,
      canReadWorkflowExecution: true,
      canCancelWorkflowExecution: true,
    });
    mockUseWorkflowsUIEnabledSetting.mockReturnValue(true);
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: true });
    useKibanaMock.mockReturnValue(createMockKibana());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hook return values', () => {
    it('returns run workflow menu item and panel when user has write, workflow UI enabled, and execute capability', () => {
      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toHaveLength(1);
      expect(result.current.runWorkflowMenuItem[0]['data-test-subj']).toBe('run-workflow-action');
      expect(result.current.runWorkflowMenuItem[0].key).toBe('run-workflow-action');
      expect(result.current.runWorkflowMenuItem[0].name).toBe(i18n.CONTEXT_MENU_RUN_WORKFLOW);
      expect(result.current.runWorkflowMenuItem[0].panel).toBe(RUN_WORKFLOW_PANEL_ID);

      expect(result.current.runAlertWorkflowPanel).toHaveLength(1);
      expect(result.current.runAlertWorkflowPanel[0].id).toBe(RUN_WORKFLOW_PANEL_ID);
      expect(result.current.runAlertWorkflowPanel[0].title).toBe(i18n.SELECT_WORKFLOW_PANEL_TITLE);
      expect(result.current.runAlertWorkflowPanel[0]['data-test-subj']).toBe(
        'alert-workflow-context-menu-panel'
      );
    });

    it('returns empty lists when workflow UI is disabled', () => {
      mockUseWorkflowsUIEnabledSetting.mockReturnValue(false);

      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runAlertWorkflowPanel).toEqual([]);
    });

    it('returns empty lists when user does not have executeWorkflow capability', () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        canCreateWorkflow: true,
        canReadWorkflow: true,
        canReadManagedWorkflow: true,
        canUpdateWorkflow: true,
        canDeleteWorkflow: true,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: true,
        canCancelWorkflowExecution: true,
      });

      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runAlertWorkflowPanel).toEqual([]);
    });

    it('returns empty lists when user does not have index write', () => {
      (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasIndexWrite: false });

      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runAlertWorkflowPanel).toEqual([]);
    });

    it('returns empty lists when workflow ui setting is disabled', () => {
      mockUseWorkflowsUIEnabledSetting.mockReturnValue(false);

      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runAlertWorkflowPanel).toEqual([]);
    });
  });

  describe('panel content', () => {
    it('renders the workflow panel with selector and execute button', async () => {
      const { result } = renderHook(() => useRunAlertWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });
      const items = result.current.runWorkflowMenuItem;
      const panels = result.current.runAlertWorkflowPanel;
      const { getByTestId } = renderContextMenu(items, panels);

      await waitFor(() => {
        expect(getByTestId('workflow-selector-mock')).toBeInTheDocument();
      });
      expect(getByTestId('run-workflow-execute-button')).toBeInTheDocument();
    });
  });
});

describe('AlertWorkflowsPanel executor', () => {
  it('uses the executor from the embedding surface', () => {
    const alertIds = [{ _id: 'alert-123', _index: 'alerts-index' }];
    const runWorkflow = jest.fn();

    render(
      <AlertWorkflowExecutorProvider runWorkflow={runWorkflow}>
        <AlertWorkflowsPanel alertIds={alertIds} onClose={jest.fn()} />
      </AlertWorkflowExecutorProvider>
    );

    expect(mockRunWorkflowPanel.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ runWorkflow })
    );
  });

  it('leaves the executor undefined outside an embedding surface', () => {
    render(
      <AlertWorkflowsPanel
        alertIds={[{ _id: 'alert-123', _index: 'alerts-index' }]}
        onClose={jest.fn()}
      />
    );

    expect(mockRunWorkflowPanel.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ runWorkflow: undefined })
    );
  });
});
// Full RunWorkflowPanel behavior (mutate, toasts, manual inputs) is covered by:
//   src/platform/packages/shared/kbn-workflows-ui/src/components/run_workflow_panel/run_workflow_panel.test.tsx
