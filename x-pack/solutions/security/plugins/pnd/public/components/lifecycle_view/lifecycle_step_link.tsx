/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { useWorkflowsDeepLink } from '../../hooks/use_workflows_deep_link';
import * as i18n from './translations';

export interface LifecycleStepLinkProps {
  /**
   * The link's accessible name. Every step link reads "View step", so without one the lifecycle
   * presents 14 links with identical names and no way to tell which row each belongs to.
   */
  ariaLabel?: string;
  /** Overrides the link label; the subordinate line labels itself. */
  label?: string;
  projection?: PndPhaseStepProjection;
}

/**
 * The link from one lifecycle row to its own step execution in the Workflows app.
 *
 * The `deepLinkPath` is used **verbatim** from the projection — it already carries this row's own
 * `stepExecutionId`, which is what makes each live row resolve to its own link instead of every row
 * on a run sharing one. Never rebuild it client-side: the server encodes every segment and avoids the
 * two reserved pseudo-step ids that would silently select the run overview instead.
 *
 * Two absences are told apart rather than both rendering as a dead link, because they mean different
 * things to an analyst: nothing has executed for this row yet, or it did execute but this Kibana has
 * no Workflows app to open it in.
 */
export const LifecycleStepLink: React.FC<LifecycleStepLinkProps> = ({
  ariaLabel,
  label,
  projection,
}) => {
  const { url } = useWorkflowsDeepLink(projection?.deepLinkPath);

  if (url == null) {
    const hasExecution = Boolean(projection?.deepLinkPath);

    return (
      <EuiToolTip
        content={
          hasExecution ? i18n.WORKFLOWS_APP_UNAVAILABLE_TOOLTIP : i18n.NO_STEP_EXECUTION_TOOLTIP
        }
      >
        <EuiText
          color="subdued"
          data-test-subj="pndLifecycleStepLinkUnavailable"
          size="xs"
          tabIndex={0}
        >
          {hasExecution ? i18n.WORKFLOWS_APP_UNAVAILABLE : i18n.NO_STEP_EXECUTION}
        </EuiText>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={i18n.VIEW_STEP_TOOLTIP}>
      <EuiLink
        aria-label={ariaLabel}
        data-test-subj="pndLifecycleStepLink"
        external
        href={url}
        // a new tab so the lifecycle the analyst is reading stays open behind the developer surface
        target="_blank"
      >
        {label ?? i18n.VIEW_STEP}
      </EuiLink>
    </EuiToolTip>
  );
};
