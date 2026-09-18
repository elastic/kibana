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
import { useCaseAttachmentWorkflowRun } from '@kbn/cases-plugin/public';
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
   * When set, the panel was opened from a single-document row action inside a case. The
   * executor routes through the Cases API with a `cases.attachment` origin so the run appears in
   * the case activity feed. Outside a case the value is ignored — the panel falls back to
   * the generic Workflows API.
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
  const caseRunWorkflow = useCaseAttachmentWorkflowRun({
    attachmentType: SECURITY_EVENT_ATTACHMENT_TYPE,
    attachmentId: originEventId,
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
      runWorkflow={caseRunWorkflow}
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
   * When set, the document panel routes the run through the Cases API with a `cases.attachment`
   * origin. Pass `ecsRowData._id` from the case events table row action. Callers outside a
   * case context omit this and get the generic Workflows API executor.
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

  const canRunWorkflow = useMemo(
    () => workflowUIEnabled && canExecuteWorkflow,
    [workflowUIEnabled, canExecuteWorkflow]
  );

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
