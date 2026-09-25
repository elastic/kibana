/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { MAX_RUN_WORKFLOW_DOCS, type WorkflowListItemDto } from '@kbn/workflows';
import {
  RunWorkflowPanel,
  useWorkflowsCapabilities,
  useWorkflowsUIEnabledSetting,
} from '@kbn/workflows-ui';
import { RUN_DOCUMENT_WORKFLOW_ACTION_ID } from '../../../../common/constants/action_ids';
import * as i18n from '../translations';

// Sort manual-trigger workflows to the top. Module-scoped so the reference is stable across renders.
const sortManualWorkflow = (a: WorkflowListItemDto, b: WorkflowListItemDto) =>
  Number((b.definition?.triggers ?? []).some((t) => t.type === 'manual')) -
  Number((a.definition?.triggers ?? []).some((t) => t.type === 'manual'));

export type DocumentTableContextMenuItem = EuiContextMenuPanelItemDescriptor;

export interface DocumentWorkflowsPanelProps {
  /**
   * Full documents including _id, _index, and all source fields. Used for single-row or
   * pre-expanded selections. Mutually exclusive with `documentIds` / `querySelection`.
   */
  documents?: Array<{ _id: string; _index: string } & Record<string, unknown>>;
  /**
   * Compact id selection expanded server-side via mget. Preferred for multi-selection so
   * the request does not embed full document source.
   */
  documentIds?: Array<{ _id: string; _index: string }>;
  /**
   * Query-based selection expanded server-side. Used for "select all" so the whole
   * selection is processed without enumerating documents on the client.
   */
  querySelection?: {
    query: QueryDslQueryContainer;
    index: string | string[];
  };
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
}

/** A panel that lets users select and execute a workflow against one or more documents. **/
export const DocumentWorkflowsPanel = ({
  documents,
  documentIds,
  querySelection,
  onClose,
  onExecute,
}: DocumentWorkflowsPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const inputs = useMemo(() => {
    if (querySelection) {
      return {
        event: {
          triggerType: 'document' as const,
          querySelection,
        },
      };
    }
    if (documentIds) {
      return {
        event: {
          triggerType: 'document' as const,
          documentIds,
        },
      };
    }
    return {
      event: {
        triggerType: 'document' as const,
        documents: documents ?? [],
      },
    };
  }, [documents, documentIds, querySelection]);

  // On "select all" (query selection) the server caps expansion, so state explicitly that only
  // the most recent N matching events will run instead of silently truncating.
  const notice = useMemo(
    () =>
      querySelection ? (
        <EuiCallOut
          announceOnMount
          data-test-subj="run-document-workflow-select-all-cap"
          size="s"
          color="warning"
          iconType="warning"
          title={i18n.RUN_WORKFLOW_SELECT_ALL_CAP_TITLE}
          css={{ marginBottom: euiTheme.size.s }}
        >
          {i18n.RUN_WORKFLOW_SELECT_ALL_CAP_DOCUMENTS(MAX_RUN_WORKFLOW_DOCS)}
        </EuiCallOut>
      ) : undefined,
    [querySelection, euiTheme]
  );

  return (
    <RunWorkflowPanel
      inputs={inputs}
      sortWorkflow={sortManualWorkflow}
      notice={notice}
      onClose={onClose}
      onExecute={onExecute}
    />
  );
};

export const RUN_DOCUMENT_WORKFLOW_PANEL_ID = 'RUN_DOCUMENT_WORKFLOW_PANEL_ID';
export const RUN_DOCUMENT_WORKFLOWS_PANEL_WIDTH = 400;
export interface UseRunDocumentWorkflowPanelProps {
  /** Full documents including _id, _index, and all source fields (single-row / pre-expanded). */
  documents?: Array<{ _id: string; _index: string } & Record<string, unknown>>;
  /** Compact id selection expanded server-side via mget (preferred for multi-selection). */
  documentIds?: Array<{ _id: string; _index: string }>;
  /**
   * Query-based selection expanded server-side. Used for "select all" so the whole selection
   * is processed instead of only the documents loaded on the current page.
   */
  querySelection?: {
    query: QueryDslQueryContainer;
    index: string | string[];
  };
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
  documentIds,
  querySelection,
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
            documentIds={documentIds}
            querySelection={querySelection}
            onClose={closePopover}
          />
        ),
      },
    ],
    [closePopover, documents, documentIds, querySelection]
  );

  return useMemo(
    () => ({
      runWorkflowMenuItem: canRunWorkflow ? runWorkflowMenuItem : [],
      runDocumentWorkflowPanel: canRunWorkflow ? runDocumentWorkflowPanel : [],
    }),
    [canRunWorkflow, runWorkflowMenuItem, runDocumentWorkflowPanel]
  );
};
