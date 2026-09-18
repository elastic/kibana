/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { WorkflowListItemDto } from '@kbn/workflows';
import {
  RunWorkflowPanel,
  useWorkflowsCapabilities,
  useWorkflowsUIEnabledSetting,
} from '@kbn/workflows-ui';
import * as i18n from '../translations';
import type { RunWorkflowSelectionScope } from './use_run_workflow_selection';
import {
  RunWorkflowSelectionStatus,
  useResolvedRunWorkflowSelection,
  useRunWorkflowSelectionSearch,
} from './use_run_workflow_selection';

// Sort manual-trigger workflows to the top. Module-scoped so the reference is stable across renders.
const sortManualWorkflow = (a: WorkflowListItemDto, b: WorkflowListItemDto) =>
  Number((b.definition?.triggers ?? []).some((t) => t.type === 'manual')) -
  Number((a.definition?.triggers ?? []).some((t) => t.type === 'manual'));

export type DocumentTableContextMenuItem = EuiContextMenuPanelItemDescriptor;

export interface DocumentSelection {
  _id: string;
  _index: string;
}

/**
 * How the selected documents reach the workflow. Callers pass exactly one:
 *
 * - `documents` embeds each document's source in the request. Fine for a single row.
 * - `documentIds` sends only `(id, index)` pairs and lets the server fetch the sources, which
 *   keeps the request small for bulk selections.
 */
export type DocumentWorkflowsSelection =
  | { documents: Array<DocumentSelection & Record<string, unknown>>; documentIds?: never }
  | { documentIds: DocumentSelection[]; documents?: never };

export type DocumentWorkflowsPanelProps = DocumentWorkflowsSelection & {
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
};

/** A panel that lets users select and execute a workflow against one or more documents. **/
export const DocumentWorkflowsPanel = ({
  documents,
  documentIds,
  onClose,
  onExecute,
}: DocumentWorkflowsPanelProps) => {
  const inputs = useMemo(
    () => ({
      event: {
        triggerType: 'document' as const,
        ...(documentIds !== undefined ? { documentIds } : { documents }),
      },
    }),
    [documents, documentIds]
  );

  return (
    <RunWorkflowPanel
      inputs={inputs}
      sortWorkflow={sortManualWorkflow}
      onClose={onClose}
      onExecute={onExecute}
    />
  );
};

export const RUN_DOCUMENT_WORKFLOW_PANEL_ID = 'RUN_DOCUMENT_WORKFLOW_PANEL_ID';
export const RUN_DOCUMENT_WORKFLOWS_PANEL_WIDTH = 400;

export type UseRunDocumentWorkflowPanelProps = DocumentWorkflowsSelection & {
  closePopover: () => void;
  /**
   * True when the user chose "select all N". A table only hands over its loaded rows, so the
   * rest of the selection has to be resolved from `selectionScope` before the run payload can
   * be built. Ignored unless `selectionScope` is also supplied.
   */
  isAllSelected?: boolean;
  /**
   * Query context used to resolve a select-all beyond the loaded rows. Callers that cannot
   * describe their selection as a query omit it, and the run stays scoped to the loaded rows.
   */
  selectionScope?: RunWorkflowSelectionScope;
};

/**
 * Resolves a select-all into concrete ids, then renders the run panel against them.
 *
 * Split out as a component so the search only runs once the context menu actually opens this
 * panel, rather than on every render of the hook that declares it.
 */
const ResolvingDocumentWorkflowsPanel = ({
  pageSelections,
  selectionScope,
  onClose,
}: {
  pageSelections: DocumentSelection[];
  selectionScope: RunWorkflowSelectionScope;
  onClose: () => void;
}) => {
  const searchDocumentIds = useRunWorkflowSelectionSearch(selectionScope);
  const selection = useResolvedRunWorkflowSelection({
    isAllSelected: true,
    pageSelections,
    searchSelectionIds: searchDocumentIds,
  });

  return (
    <RunWorkflowSelectionStatus selection={selection}>
      {selection.status === 'ready' && (
        <DocumentWorkflowsPanel documentIds={selection.selections} onClose={onClose} />
      )}
    </RunWorkflowSelectionStatus>
  );
};

export interface UseRunDocumentWorkflowPanelResult {
  /** Context menu action that opens the run workflow panel. */
  runWorkflowMenuItem: DocumentTableContextMenuItem[];
  /** Context menu panel descriptor used to render the workflow selector. */
  runDocumentWorkflowPanel: EuiContextMenuPanelDescriptor[];
}

export const useRunDocumentWorkflowPanel = ({
  closePopover,
  documents,
  documentIds,
  isAllSelected = false,
  selectionScope,
}: UseRunDocumentWorkflowPanelProps): UseRunDocumentWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();

  const canRunWorkflow = useMemo(
    () => workflowUIEnabled && canExecuteWorkflow,
    [workflowUIEnabled, canExecuteWorkflow]
  );

  // Only resolve a select-all when the caller described its selection as a query; otherwise the
  // loaded rows are all there is to run on.
  const selectAllScope = isAllSelected ? selectionScope : undefined;

  const panelContent = useMemo(() => {
    if (selectAllScope !== undefined) {
      return (
        <ResolvingDocumentWorkflowsPanel
          pageSelections={documentIds ?? []}
          selectionScope={selectAllScope}
          onClose={closePopover}
        />
      );
    }
    if (documentIds !== undefined) {
      return <DocumentWorkflowsPanel documentIds={documentIds} onClose={closePopover} />;
    }
    return <DocumentWorkflowsPanel documents={documents ?? []} onClose={closePopover} />;
  }, [selectAllScope, documentIds, documents, closePopover]);

  const runWorkflowMenuItem: DocumentTableContextMenuItem[] = useMemo(
    () => [
      {
        'aria-label': i18n.CONTEXT_MENU_RUN_WORKFLOW,
        'data-test-subj': 'run-document-workflow-action',
        key: 'run-document-workflow-action',
        name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
        panel: RUN_DOCUMENT_WORKFLOW_PANEL_ID,
      },
    ],
    []
  );

  const runDocumentWorkflowPanel: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: RUN_DOCUMENT_WORKFLOW_PANEL_ID,
        title: i18n.SELECT_WORKFLOW_PANEL_TITLE,
        'data-test-subj': 'document-workflow-context-menu-panel',
        width: RUN_DOCUMENT_WORKFLOWS_PANEL_WIDTH,
        content: panelContent,
      },
    ],
    [panelContent]
  );

  return useMemo(
    () => ({
      runWorkflowMenuItem: canRunWorkflow ? runWorkflowMenuItem : [],
      runDocumentWorkflowPanel: canRunWorkflow ? runDocumentWorkflowPanel : [],
    }),
    [canRunWorkflow, runWorkflowMenuItem, runDocumentWorkflowPanel]
  );
};
