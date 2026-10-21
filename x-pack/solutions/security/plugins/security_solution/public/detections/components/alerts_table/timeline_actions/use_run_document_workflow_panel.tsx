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
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import type { WorkflowListItemDto } from '@kbn/workflows';
import {
  RunWorkflowPanel,
  useWorkflowsCapabilities,
  useWorkflowsUIEnabledSetting,
} from '@kbn/workflows-ui';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentWorkflowTarget } from '@kbn/cases-plugin/public';
import {
  useCaseAttachmentWorkflowRouting,
  useCaseAttachmentWorkflowRun,
} from '@kbn/cases-plugin/public';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../common/constants/action_ids';
import * as i18n from '../translations';
import { getRunWorkflowTelemetry } from '../../../../common/lib/telemetry/run_workflow_telemetry';
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

export interface DocumentWorkflowsPanelProps {
  /**
   * The selected documents as `(id, index)` pairs. The server fetches each document's fields,
   * so the request stays small no matter how many are selected, and every caller produces the
   * same document shape.
   */
  documentIds: DocumentSelection[];
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
  /**
   * When set, the panel was opened from a single-document row action. Inside a case the executor
   * routes through the Cases API with a `cases.attachment` origin so the run appears in the case
   * activity feed. Absent for bulk actions, which use `cases.attachments` with the document ids.
   * Outside a case the value is ignored — the panel falls back to the generic Workflows API.
   */
  originEventId?: string;
  /** Reports the run as a bulk run outside a case. Bulk actions set it. */
  isBulk?: boolean;
}

/** A panel that lets users select and execute a workflow against one or more documents. **/
export const DocumentWorkflowsPanel = ({
  documentIds,
  onClose,
  onExecute,
  originEventId,
  isBulk = false,
}: DocumentWorkflowsPanelProps) => {
  const target = useMemo(
    (): CaseAttachmentWorkflowTarget =>
      originEventId !== undefined
        ? { attachmentId: originEventId }
        : { attachmentIds: documentIds.map(({ _id }) => _id) },
    [documentIds, originEventId]
  );
  const fallbackTelemetry = useMemo(
    () => getRunWorkflowTelemetry({ surface: 'document', isBulk, itemCount: documentIds.length }),
    [documentIds.length, isBulk]
  );
  const { runWorkflow, showSuccessToast, telemetry } = useCaseAttachmentWorkflowRun({
    attachmentType: SECURITY_EVENT_ATTACHMENT_TYPE,
    target,
    fallbackTelemetry,
  });

  const inputs = useMemo(
    () => ({
      event: {
        triggerType: 'document' as const,
        documentIds,
      },
    }),
    [documentIds]
  );

  return (
    <RunWorkflowPanel
      inputs={inputs}
      runWorkflow={runWorkflow}
      showSuccessToast={showSuccessToast}
      telemetry={telemetry}
      sortWorkflow={sortManualWorkflow}
      onClose={onClose}
      onExecute={onExecute}
    />
  );
};

export const RUN_DOCUMENT_WORKFLOW_PANEL_ID = 'RUN_DOCUMENT_WORKFLOW_PANEL_ID';
export const RUN_DOCUMENT_WORKFLOWS_PANEL_WIDTH = 400;
export interface UseRunDocumentWorkflowPanelProps {
  documentIds: DocumentSelection[];
  closePopover: () => void;
  /**
   * Pass `ecsRowData._id` from a row action so a run inside a case uses a `cases.attachment`
   * origin. Omit for bulk actions. Outside a case the value is ignored. Inside a case, the menu
   * item is hidden when Cases runs are unavailable or there is no document to target.
   */
  originEventId?: string;
  /** Reports the run as a bulk run outside a case. Bulk actions set it. */
  isBulk?: boolean;
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
  /**
   * Number of hits a select-all covers. Past `MAX_RUN_WORKFLOW_DOCS` the menu item is disabled
   * with a tooltip explaining why. Only read when a select-all is resolved from `selectionScope`.
   */
  totalItems?: number;
}

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
  isBulk,
}: {
  pageSelections: DocumentSelection[];
  selectionScope: RunWorkflowSelectionScope;
  onClose: () => void;
  isBulk?: boolean;
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
        <DocumentWorkflowsPanel
          documentIds={selection.selections}
          onClose={onClose}
          isBulk={isBulk}
        />
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
  documentIds,
  originEventId,
  isBulk,
  isAllSelected = false,
  selectionScope,
  totalItems,
}: UseRunDocumentWorkflowPanelProps): UseRunDocumentWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  // Inside a case, only offer the action when the run can be recorded on the case.
  const caseRouting = useCaseAttachmentWorkflowRouting();
  const hasCaseTarget = originEventId !== undefined || documentIds.length > 0;
  const canRunInCase = caseRouting === 'outside' || (caseRouting === 'available' && hasCaseTarget);

  const canRunWorkflow = useMemo(
    () => workflowUIEnabled && canExecuteWorkflow && canRunInCase,
    [workflowUIEnabled, canExecuteWorkflow, canRunInCase]
  );

  // Only resolve a select-all when the caller described its selection as a query; otherwise the
  // loaded rows are all there is to run on.
  const selectAllScope = isAllSelected ? selectionScope : undefined;

  const panelContent = useMemo(
    () =>
      selectAllScope !== undefined ? (
        <ResolvingDocumentWorkflowsPanel
          pageSelections={documentIds}
          selectionScope={selectAllScope}
          onClose={closePopover}
          isBulk={isBulk}
        />
      ) : (
        <DocumentWorkflowsPanel
          documentIds={documentIds}
          onClose={closePopover}
          originEventId={originEventId}
          isBulk={isBulk}
        />
      ),
    [selectAllScope, documentIds, closePopover, originEventId, isBulk]
  );

  const selectionSize =
    selectAllScope !== undefined && totalItems !== undefined ? totalItems : documentIds.length;
  const exceedsLimit = selectionSize > MAX_RUN_WORKFLOW_DOCS;

  const runWorkflowMenuItem: DocumentTableContextMenuItem[] = useMemo(
    () => [
      {
        'aria-label': i18n.CONTEXT_MENU_RUN_WORKFLOW,
        'data-test-subj': 'run-document-workflow-action',
        icon: 'workflow',
        key: RUN_DOCUMENT_WORKFLOW_ACTION_ID,
        name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
        panel: RUN_DOCUMENT_WORKFLOW_PANEL_ID,
        ...(exceedsLimit && {
          disabled: true,
          toolTipContent: i18n.RUN_WORKFLOW_SELECTION_TOO_LARGE(MAX_RUN_WORKFLOW_DOCS),
        }),
      },
    ],
    [exceedsLimit]
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
