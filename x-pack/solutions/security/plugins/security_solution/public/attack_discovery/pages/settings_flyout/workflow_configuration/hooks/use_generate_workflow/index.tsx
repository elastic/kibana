/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useInvalidateListWorkflows } from '../use_list_workflows';
import * as i18n from './translations';

const GENERATE_WORKFLOW_URL = '/internal/attack_discovery/_generate_workflow';

const getWorkflowEditorUrl = ({
  application,
  workflowId,
}: {
  application: { getUrlForApp: (appId: string, options?: { path?: string }) => string };
  workflowId: string;
}): string | null => {
  try {
    const encodedId = encodeURIComponent(workflowId);

    return application.getUrlForApp('workflows', { path: `/${encodedId}` });
  } catch {
    return null;
  }
};

export interface GeneratedWorkflow {
  workflow_id: string;
  workflow_name: string;
}

export interface UseGenerateWorkflowResult {
  cancelGeneration: () => void;
  generatedWorkflow: GeneratedWorkflow | null;
  isGenerating: boolean;
  startGeneration: (description: string, connectorId: string) => void;
}

/**
 * React hook that manages the API call to POST /internal/attack_discovery/_generate_workflow.
 *
 * Handles loading state, cancellation via AbortController, toast notifications,
 * and workflow list invalidation on success.
 *
 * @returns An object with startGeneration, cancelGeneration, isGenerating, and generatedWorkflow
 */
export const useGenerateWorkflow = (): UseGenerateWorkflowResult => {
  const { services } = useKibana();
  const { application, http } = services;
  const { addError, addSuccess } = useAppToasts();
  const invalidateListWorkflows = useInvalidateListWorkflows();

  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(
    (description: string, connectorId: string) => {
      // Abort any in-flight request before starting a new one
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsGenerating(true);
      setGeneratedWorkflow(null);

      http
        .post<GeneratedWorkflow>(GENERATE_WORKFLOW_URL, {
          body: JSON.stringify({
            connector_id: connectorId,
            description,
          }),
          signal: controller.signal,
          version: '1',
        })
        .then((response) => {
          if (!controller.signal.aborted) {
            setGeneratedWorkflow(response);
            setIsGenerating(false);

            const editorUrl = getWorkflowEditorUrl({
              application,
              workflowId: response.workflow_id,
            });

            addSuccess({
              text: toMountPoint(
                <EuiLink
                  data-test-subj="openWorkflowEditorLink"
                  external
                  href={editorUrl ?? undefined}
                  target="_blank"
                >
                  {i18n.OPEN_IN_WORKFLOW_EDITOR}
                </EuiLink>,
                services
              ),
              title: i18n.WORKFLOW_GENERATED_SUCCESSFULLY,
            });

            invalidateListWorkflows();
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setIsGenerating(false);
            addError(error, { title: i18n.WORKFLOW_GENERATION_FAILED });
          }
        });
    },
    [addError, addSuccess, application, http, invalidateListWorkflows, services]
  );

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  return {
    cancelGeneration,
    generatedWorkflow,
    isGenerating,
    startGeneration,
  };
};
