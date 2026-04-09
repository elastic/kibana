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
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import * as i18n from '../translations';
import { RunWorkflowPanel } from './run_workflow_panel';

export type DocumentTableContextMenuItem = EuiContextMenuPanelItemDescriptor;

export interface DocumentWorkflowsPanelProps {
  /** Full documents including _id, _index, and all source fields */
  documents: Array<{ _id: string; _index: string } & Record<string, unknown>>;
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
}

/** A panel that lets users select and execute a workflow against one or more documents. **/
export const DocumentWorkflowsPanel = ({
  documents,
  onClose,
  onExecute,
}: DocumentWorkflowsPanelProps) => {
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
      sortTriggerType="manual"
      executeButtonTestSubj="execute-document-workflow-button"
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
        size: 's',
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
        content: <DocumentWorkflowsPanel documents={documents} onClose={closePopover} />,
      },
    ],
    [closePopover, documents]
  );

  return useMemo(
    () => ({
      runWorkflowMenuItem: canRunWorkflow ? runWorkflowMenuItem : [],
      runDocumentWorkflowPanel: canRunWorkflow ? runDocumentWorkflowPanel : [],
    }),
    [canRunWorkflow, runWorkflowMenuItem, runDocumentWorkflowPanel]
  );
};
