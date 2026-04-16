/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { resolveWorkflowIdFromAlias } from './helpers/resolve_workflow_id_from_alias';

export interface UseWorkflowEditorLinkParams {
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}

export interface UseWorkflowEditorLink {
  editorUrl: string | null;
  navigateToEditor: () => void;
  resolvedWorkflowId: string | null;
}

/**
 * Hook that generates deep links to the Workflows editor execution view.
 *
 * @param workflowId - The ID of the workflow
 * @param workflowRunId - The ID of the workflow execution run
 * @returns An object containing the editor URL and a navigation callback
 *
 * @example
 * ```typescript
 * const { editorUrl, navigateToEditor } = useWorkflowEditorLink({
 *   workflowId: 'workflow-123',
 *   workflowRunId: 'run-456'
 * });
 *
 * // Use in a link
 * <a href={editorUrl}>View in Editor</a>
 *
 * // Use in a button
 * <button onClick={navigateToEditor}>Open Editor</button>
 * ```
 */
export const useWorkflowEditorLink = ({
  workflowId,
  workflowRunId,
}: UseWorkflowEditorLinkParams): UseWorkflowEditorLink => {
  const { application, http } = useKibana().services;
  const [resolvedWorkflowId, setResolvedWorkflowId] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    let isSubscribed = true;

    const run = async () => {
      if (!workflowId || workflowId.startsWith('workflow-')) {
        setResolvedWorkflowId(null);
        return;
      }

      setResolvedWorkflowId(undefined);
      const resolvedId = await resolveWorkflowIdFromAlias({ alias: workflowId, http });

      if (isSubscribed) {
        setResolvedWorkflowId(resolvedId);
      }
    };

    run();

    return () => {
      isSubscribed = false;
    };
  }, [http, workflowId]);

  const editorLink = useMemo(() => {
    // Without a workflow id we can't link anywhere.
    if (!workflowId) {
      return null;
    }

    const effectiveWorkflowId = workflowId.startsWith('workflow-')
      ? workflowId
      : resolvedWorkflowId;
    if (!effectiveWorkflowId) {
      return null;
    }

    const encodedWorkflowId = encodeURIComponent(effectiveWorkflowId);
    const executionId = workflowRunId ?? undefined;
    const path = executionId
      ? `/${encodedWorkflowId}?tab=executions&executionId=${encodeURIComponent(executionId)}`
      : `/${encodedWorkflowId}`;

    try {
      return {
        path,
        url: application.getUrlForApp('workflows', { path }),
      };
    } catch {
      return null;
    }
  }, [application, resolvedWorkflowId, workflowId, workflowRunId]);

  const navigateToEditor = useCallback(() => {
    if (editorLink) {
      application.navigateToApp('workflows', {
        openInNewTab: true,
        path: editorLink.path,
      });
    }
  }, [application, editorLink]);

  return {
    editorUrl: editorLink?.url ?? null,
    navigateToEditor,
    resolvedWorkflowId: resolvedWorkflowId ?? null,
  };
};
