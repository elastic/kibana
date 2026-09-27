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
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentWorkflowTarget } from '@kbn/cases-plugin/public';
import {
  useCaseAttachmentWorkflowRouting,
  useCaseAttachmentWorkflowRun,
} from '@kbn/cases-plugin/public';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../common/constants/action_ids';
import * as i18n from '../translations';

// Sort manual-trigger workflows to the top. Module-scoped so the reference is stable across renders.
const sortManualWorkflow = (a: WorkflowListItemDto, b: WorkflowListItemDto) =>
  Number((b.definition?.triggers ?? []).some((t) => t.type === 'manual')) -
  Number((a.definition?.triggers ?? []).some((t) => t.type === 'manual'));

export type DocumentTableContextMenuItem = EuiContextMenuPanelItemDescriptor;

export interface DocumentWorkflowsPanelProps {
  /** Full documents including _id, _index, and all source fields */
  documents: Array<{ _id: string; _index: string } & Record<string, unknown>>;
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
}

/** A panel that lets users select and execute a workflow against one or more documents. **/
export const DocumentWorkflowsPanel = ({
  documents,
  onClose,
  onExecute,
  originEventId,
}: DocumentWorkflowsPanelProps) => {
  const target = useMemo(
    (): CaseAttachmentWorkflowTarget =>
      originEventId !== undefined
        ? { attachmentId: originEventId }
        : { attachmentIds: documents.map(({ _id }) => _id) },
    [documents, originEventId]
  );
  const { runWorkflow, showSuccessToast } = useCaseAttachmentWorkflowRun({
    attachmentType: SECURITY_EVENT_ATTACHMENT_TYPE,
    target,
  });

  const inputs = useMemo(
    () => ({
      event: {
        triggerType: 'document' as const,
        documents,
      },
    }),
    [documents]
  );

  return (
    <RunWorkflowPanel
      inputs={inputs}
      runWorkflow={runWorkflow}
      showSuccessToast={showSuccessToast}
      sortWorkflow={sortManualWorkflow}
      onClose={onClose}
      onExecute={onExecute}
    />
  );
};

export const RUN_DOCUMENT_WORKFLOW_PANEL_ID = 'RUN_DOCUMENT_WORKFLOW_PANEL_ID';
export const RUN_DOCUMENT_WORKFLOWS_PANEL_WIDTH = 400;
export interface UseRunDocumentWorkflowPanelProps {
  /** Full documents including _id, _index, and all source fields */
  documents: Array<{ _id: string; _index: string } & Record<string, unknown>>;
  closePopover: () => void;
  /**
   * Pass `ecsRowData._id` from a row action so a run inside a case uses a `cases.attachment`
   * origin. Omit for bulk actions. Outside a case the value is ignored. Inside a case, the menu
   * item is hidden when Cases runs are unavailable or there is no document to target.
   */
  originEventId?: string;
}

export interface UseRunDocumentWorkflowPanelResult {
  /** Context menu action that opens the run workflow panel. */
  runWorkflowMenuItem: DocumentTableContextMenuItem[];
  /** Context menu panel descriptor used to render the workflow selector. */
  runDocumentWorkflowPanel: EuiContextMenuPanelDescriptor[];
}

export const useRunDocumentWorkflowPanel = ({
  closePopover,
  documents,
  originEventId,
}: UseRunDocumentWorkflowPanelProps): UseRunDocumentWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  // Inside a case, only offer the action when the run can be recorded on the case.
  const caseRouting = useCaseAttachmentWorkflowRouting();
  const hasCaseTarget = originEventId !== undefined || documents.length > 0;
  const canRunInCase = caseRouting === 'outside' || (caseRouting === 'available' && hasCaseTarget);

  const canRunWorkflow = useMemo(
    () => workflowUIEnabled && canExecuteWorkflow && canRunInCase,
    [workflowUIEnabled, canExecuteWorkflow, canRunInCase]
  );

  const runWorkflowMenuItem: DocumentTableContextMenuItem[] = useMemo(
    () => [
      {
        'aria-label': i18n.CONTEXT_MENU_RUN_WORKFLOW,
        'data-test-subj': 'run-document-workflow-action',
        icon: 'workflow',
        key: RUN_DOCUMENT_WORKFLOW_ACTION_ID,
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
        content: (
          <DocumentWorkflowsPanel
            documents={documents}
            onClose={closePopover}
            originEventId={originEventId}
          />
        ),
      },
    ],
    [closePopover, documents, originEventId]
  );

  return useMemo(
    () => ({
      runWorkflowMenuItem: canRunWorkflow ? runWorkflowMenuItem : [],
      runDocumentWorkflowPanel: canRunWorkflow ? runDocumentWorkflowPanel : [],
    }),
    [canRunWorkflow, runWorkflowMenuItem, runDocumentWorkflowPanel]
  );
};
