/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../common/lib/kibana';
import {
  WORKFLOW_ID_ALIASES_TO_TAGS,
  resolveWorkflowIdFromAlias,
} from './helpers/resolve_workflow_id_from_alias';

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

    // For slug-based IDs not in the alias map, resolvedWorkflowId will be null after the
    // effect runs (resolveWorkflowIdFromAlias returns null immediately for unknown slugs).
    // In that case, the workflowId itself is already the actual workflow slug — use it directly.
    // undefined means alias resolution is still in-flight; show no link until it resolves.
    // If the workflowId IS a known alias but the workflow wasn't found in the database, return
    // null rather than producing a broken URL with the alias string as the path segment.
    const effectiveWorkflowId = workflowId.startsWith('workflow-')
      ? workflowId
      : resolvedWorkflowId === undefined
      ? undefined
      : resolvedWorkflowId !== null
      ? resolvedWorkflowId
      : workflowId in WORKFLOW_ID_ALIASES_TO_TAGS
      ? null
      : workflowId;
    if (effectiveWorkflowId == null) {
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
