/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import type { RenderOutputContent, TrackedExecution } from '@kbn/workflows-ui';
import { useKibana } from '../common/lib/kibana';
import { CASES_PATH } from '../../common/constants';

/**
 * Registry of custom output renderers for the execution tracker flyout.
 *
 * Each entry defines:
 *  - `match`: returns true if this renderer should handle the execution
 *  - `render`: returns the React node to display in the output area
 *
 * Renderers are additive — all matching entries are rendered, each in its own
 * block. If no entry matches, the default key-value output display is used.
 *
 * To add a new renderer, append an entry to the array below.
 */
interface OutputRenderer {
  /** A short identifier for this renderer (used for debugging / readability). */
  id: string;
  /** Return true if this renderer should handle the given execution. */
  match: (execution: TrackedExecution) => boolean;
  /** Return the React node to render in the output section. */
  render: (execution: TrackedExecution, application: ApplicationStart) => React.ReactNode;
}

const outputRenderers: OutputRenderer[] = [
  {
    id: 'case-link',
    match: (execution) => !!execution.output?.caseId,
    render: (execution, application) => {
      const caseHref = application.getUrlForApp('securitySolutionUI', {
        path: `${CASES_PATH}/${String(execution.output?.caseId)}`,
      });

      return (
        <EuiLink href={caseHref} external={false}>
          <EuiText size="xs">
            {i18n.translate('xpack.securitySolution.executionTracker.viewCase', {
              defaultMessage: 'View case',
            })}
          </EuiText>
        </EuiLink>
      );
    },
  },

  // --- Add new renderers here ---
];

/**
 * Hook that returns a `RenderOutputContent` callback wired to the output
 * renderer registry. Use this in the component that mounts `ExecutionTrackerProvider`.
 *
 * All matching renderers are rendered, stacked in registry order.
 * Returns null when no renderers match (falls back to default output display).
 */
export const useExecutionOutputRenderer = (): RenderOutputContent => {
  const { application } = useKibana().services;

  return useCallback(
    (execution) => {
      const matches = outputRenderers.filter((r) => r.match(execution));
      if (matches.length === 0) return null;

      return (
        <>
          {matches.map((r) => (
            <React.Fragment key={r.id}>{r.render(execution, application)}</React.Fragment>
          ))}
        </>
      );
    },
    [application]
  );
};
