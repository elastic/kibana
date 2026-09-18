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
import type { WorkflowListItemDto } from '@kbn/workflows';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import type { RunWorkflowPanelProps } from '@kbn/workflows-ui';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEventsHandler } from '../../../../timelines/containers';
import type { RunWorkflowSelectionScope } from './use_run_workflow_selection';
import {
  useRunDocumentWorkflowPanel,
  RUN_DOCUMENT_WORKFLOW_PANEL_ID,
  type DocumentTableContextMenuItem,
  type UseRunDocumentWorkflowPanelProps,
} from './use_run_document_workflow_panel';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import * as i18n from '../translations';

const mockMutate = jest.fn();
const mockUseRunWorkflow = jest.fn(() => ({ mutate: mockMutate }));
const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canCancelWorkflowExecution: true,
}));
const mockUseWorkflowsUIEnabledSetting = jest.fn(() => true);
const mockRunWorkflowPanelProps: RunWorkflowPanelProps[] = [];
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useKibana: jest.fn(),
  };
});
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: () => mockUseRunWorkflow(),
  useWorkflows: () => ({ data: { results: [] } }),
  useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  useWorkflowsUIEnabledSetting: () => mockUseWorkflowsUIEnabledSetting(),
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
  // This stub captures caller-owned inputs and sorting.
  RunWorkflowPanel: (props: RunWorkflowPanelProps) => {
    mockRunWorkflowPanelProps.push(props);
    return (
      <div>
        <div data-test-subj="workflow-selector-mock">{'Workflow selector stub'}</div>
        <button data-test-subj="run-workflow-execute-button" type="button">
          {'Run workflow'}
        </button>
      </div>
    );
  },
}));

jest.mock('../../../../timelines/containers');

const useKibanaMock = jest.requireMock('@kbn/kibana-react-plugin/public').useKibana as jest.Mock;

const useTimelineEventsHandlerMock = useTimelineEventsHandler as jest.MockedFunction<
  typeof useTimelineEventsHandler
>;

const timelineItem = (id: string, index: string): TimelineItem =>
  ({ _id: id, _index: index, data: [], ecs: { _id: id } } as TimelineItem);

/**
 * Stubs the id-resolving search so a select-all run resolves to `events` out of `totalCount`
 * total matches. `totalCount` above `events.length` is what signals a trimmed selection.
 */
const mockDocumentIdSearch = ({
  events,
  totalCount,
}: {
  events: TimelineItem[];
  totalCount: number;
}) => {
  const searchHandler = jest.fn((onResponse) => {
    onResponse?.({ events, totalCount } as never);
  });
  useTimelineEventsHandlerMock.mockReturnValue([
    undefined as never,
    undefined as never,
    searchHandler as never,
  ]);
  return searchHandler;
};

const defaultProps: UseRunDocumentWorkflowPanelProps = {
  closePopover: jest.fn(),
  documentIds: [{ _id: 'doc-123', _index: 'documents-index' }],
};

const createMockWorkflow = (id: string, triggerType: 'alert' | 'manual'): WorkflowListItemDto => ({
  id,
  name: id,
  description: '',
  enabled: true,
  valid: true,
  createdAt: '',
  definition: {
    triggers: [{ type: triggerType }],
  } as WorkflowListItemDto['definition'],
});

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
  items: DocumentTableContextMenuItem[],
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

describe('useRunDocumentWorkflowPanel', () => {
  beforeEach(() => {
    mockRunWorkflowPanelProps.length = 0;
    mockUseRunWorkflow.mockReturnValue({ mutate: mockMutate });
    mockUseWorkflowsCapabilities.mockReturnValue({
      canCreateWorkflow: true,
      canReadWorkflow: true,
      canUpdateWorkflow: true,
      canDeleteWorkflow: true,
      canExecuteWorkflow: true,
      canReadWorkflowExecution: true,
      canCancelWorkflowExecution: true,
    });
    mockUseWorkflowsUIEnabledSetting.mockReturnValue(true);
    useKibanaMock.mockReturnValue(createMockKibana());
    mockDocumentIdSearch({ events: [], totalCount: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hook return values', () => {
    it('returns run workflow menu item and panel when workflow UI is enabled and user has execute capability', () => {
      const { result } = renderHook(() => useRunDocumentWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toHaveLength(1);
      expect(result.current.runWorkflowMenuItem[0]['data-test-subj']).toBe(
        'run-document-workflow-action'
      );
      expect(result.current.runWorkflowMenuItem[0].key).toBe('run-document-workflow-action');
      expect(result.current.runWorkflowMenuItem[0].name).toBe(i18n.CONTEXT_MENU_RUN_WORKFLOW);
      expect(result.current.runWorkflowMenuItem[0].icon).toBe('workflow');
      expect(result.current.runWorkflowMenuItem[0].panel).toBe(RUN_DOCUMENT_WORKFLOW_PANEL_ID);

      expect(result.current.runDocumentWorkflowPanel).toHaveLength(1);
      expect(result.current.runDocumentWorkflowPanel[0].id).toBe(RUN_DOCUMENT_WORKFLOW_PANEL_ID);
      expect(result.current.runDocumentWorkflowPanel[0].title).toBe(
        i18n.SELECT_WORKFLOW_PANEL_TITLE
      );
      expect(result.current.runDocumentWorkflowPanel[0]['data-test-subj']).toBe(
        'document-workflow-context-menu-panel'
      );
    });

    it('returns empty lists when workflow UI is disabled', () => {
      mockUseWorkflowsUIEnabledSetting.mockReturnValue(false);

      const { result } = renderHook(() => useRunDocumentWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runDocumentWorkflowPanel).toEqual([]);
    });

    it('returns empty lists when user does not have executeWorkflow capability', () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        canCreateWorkflow: true,
        canReadWorkflow: true,
        canUpdateWorkflow: true,
        canDeleteWorkflow: true,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: true,
        canCancelWorkflowExecution: true,
      });

      const { result } = renderHook(() => useRunDocumentWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });

      expect(result.current.runWorkflowMenuItem).toEqual([]);
      expect(result.current.runDocumentWorkflowPanel).toEqual([]);
    });
  });

  describe('panel content', () => {
    it('renders the workflow panel with the document caller configuration', async () => {
      const { result } = renderHook(() => useRunDocumentWorkflowPanel(defaultProps), {
        wrapper: TestProviders,
      });
      const items = result.current.runWorkflowMenuItem;
      const panels = result.current.runDocumentWorkflowPanel;
      const { getByTestId } = renderContextMenu(items, panels);

      await waitFor(() => {
        expect(getByTestId('workflow-selector-mock')).toBeInTheDocument();
      });
      expect(getByTestId('run-workflow-execute-button')).toBeInTheDocument();

      const panelProps = mockRunWorkflowPanelProps[mockRunWorkflowPanelProps.length - 1];
      if (!panelProps) {
        throw new Error('Expected RunWorkflowPanel to render');
      }
      expect(panelProps.inputs).toEqual({
        event: {
          triggerType: 'document',
          documentIds: defaultProps.documentIds,
        },
      });
      expect(panelProps.visibility).toBeUndefined();
      expect(panelProps.filterWorkflow).toBeUndefined();
      expect(panelProps.onClose).toBe(defaultProps.closePopover);

      const { sortWorkflow } = panelProps;
      if (!sortWorkflow) {
        throw new Error('Expected document workflow sorting');
      }

      const alertWorkflow = createMockWorkflow('alert-workflow', 'alert');
      const manualWorkflow = createMockWorkflow('manual-workflow', 'manual');
      expect([alertWorkflow, manualWorkflow].sort(sortWorkflow)).toEqual([
        manualWorkflow,
        alertWorkflow,
      ]);
    });

    // Every caller sends id pairs and lets the server resolve the fields: it keeps a large
    // selection inside the payload limit and gives every caller the same document shape.
    it('sends only id pairs, never an embedded source', async () => {
      const documentIds = [
        { _id: 'doc-1', _index: 'documents-index' },
        { _id: 'doc-2', _index: 'documents-index' },
      ];
      const closePopover = jest.fn();
      const { result } = renderHook(
        () => useRunDocumentWorkflowPanel({ closePopover, documentIds }),
        { wrapper: TestProviders }
      );
      const { getByTestId } = renderContextMenu(
        result.current.runWorkflowMenuItem,
        result.current.runDocumentWorkflowPanel
      );

      await waitFor(() => {
        expect(getByTestId('workflow-selector-mock')).toBeInTheDocument();
      });

      const panelProps = mockRunWorkflowPanelProps[mockRunWorkflowPanelProps.length - 1];
      if (!panelProps) {
        throw new Error('Expected RunWorkflowPanel to render');
      }
      expect(panelProps.inputs).toEqual({
        event: {
          triggerType: 'document',
          documentIds,
        },
      });
      expect(panelProps.inputs).not.toHaveProperty('event.documents');
    });
  });

  // A table only hands over its loaded rows, so a "select all" has to be resolved from the
  // table's query before the run payload can be built.
  describe('select all', () => {
    const selectionScope = {
      dataViewId: 'security-solution-default',
      indexNames: ['logs-*'],
      filterQuery: '{"bool":{}}',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      runtimeMappings: {},
      queryId: 'test-table-run-workflow-selection',
    };
    const pageDocumentIds = [{ _id: 'doc-1', _index: 'logs-a' }];

    const renderSelectAllPanel = (
      props: {
        isAllSelected?: boolean;
        selectionScope?: RunWorkflowSelectionScope;
      } = {}
    ) => {
      const { result } = renderHook(
        () =>
          useRunDocumentWorkflowPanel({
            closePopover: jest.fn(),
            documentIds: pageDocumentIds,
            isAllSelected: true,
            selectionScope,
            ...props,
          }),
        { wrapper: TestProviders }
      );
      return renderContextMenu(
        result.current.runWorkflowMenuItem,
        result.current.runDocumentWorkflowPanel
      );
    };

    const lastPanelProps = () => {
      const panelProps = mockRunWorkflowPanelProps[mockRunWorkflowPanelProps.length - 1];
      if (!panelProps) {
        throw new Error('Expected RunWorkflowPanel to render');
      }
      return panelProps;
    };

    it('does not resolve beyond the loaded rows when only the page is selected', () => {
      const searchHandler = mockDocumentIdSearch({ events: [], totalCount: 0 });

      renderSelectAllPanel({ isAllSelected: false });

      expect(searchHandler).not.toHaveBeenCalled();
      expect(lastPanelProps().inputs).toEqual({
        event: { triggerType: 'document', documentIds: pageDocumentIds },
      });
    });

    it('does not resolve beyond the loaded rows when the caller has no selection scope', () => {
      const searchHandler = mockDocumentIdSearch({ events: [], totalCount: 0 });

      renderSelectAllPanel({ selectionScope: undefined });

      expect(searchHandler).not.toHaveBeenCalled();
      expect(lastPanelProps().inputs).toEqual({
        event: { triggerType: 'document', documentIds: pageDocumentIds },
      });
    });

    it('runs on every matching document, not just the loaded rows, when all are selected', async () => {
      // `doc-2` is not in `pageDocumentIds`, so it can only come from the resolving search.
      mockDocumentIdSearch({
        events: [timelineItem('doc-1', 'logs-a'), timelineItem('doc-2', 'logs-b')],
        totalCount: 2,
      });

      renderSelectAllPanel();

      await waitFor(() => {
        expect(lastPanelProps().inputs).toEqual({
          event: {
            triggerType: 'document',
            documentIds: [
              { _id: 'doc-1', _index: 'logs-a' },
              { _id: 'doc-2', _index: 'logs-b' },
            ],
          },
        });
      });
    });

    it('resolves the selection against the caller scope, capped at the supported maximum', () => {
      mockDocumentIdSearch({ events: [timelineItem('doc-1', 'logs-a')], totalCount: 1 });

      renderSelectAllPanel();

      expect(useTimelineEventsHandlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViewId: selectionScope.dataViewId,
          indexNames: selectionScope.indexNames,
          filterQuery: selectionScope.filterQuery,
          startDate: selectionScope.from,
          endDate: selectionScope.to,
          id: selectionScope.queryId,
          limit: MAX_RUN_WORKFLOW_DOCS,
          fields: ['_id'],
        })
      );
    });

    it('warns that the selection was trimmed when more documents match than the maximum', async () => {
      mockDocumentIdSearch({
        events: [timelineItem('doc-1', 'logs-a')],
        totalCount: MAX_RUN_WORKFLOW_DOCS + 1,
      });

      const { getByTestId } = renderSelectAllPanel();

      await waitFor(() => {
        expect(getByTestId('bulk-run-workflow-selection-trimmed')).toBeInTheDocument();
      });
      // The run still proceeds — on the documents that were resolved.
      expect(getByTestId('run-workflow-execute-button')).toBeInTheDocument();
    });

    it('surfaces an error instead of a partial run when resolving the selection fails', () => {
      useTimelineEventsHandlerMock.mockReturnValue([
        undefined as never,
        undefined as never,
        (() => {
          throw new Error('search failed');
        }) as never,
      ]);

      const { getByTestId, queryByTestId } = renderSelectAllPanel();

      expect(getByTestId('bulk-run-workflow-selection-error')).toBeInTheDocument();
      expect(queryByTestId('run-workflow-execute-button')).not.toBeInTheDocument();
    });
  });
});
// Full RunWorkflowPanel behavior (mutate, toasts, manual inputs) is covered by:
//   src/platform/packages/shared/kbn-workflows-ui/src/components/run_workflow_panel/run_workflow_panel.test.tsx
