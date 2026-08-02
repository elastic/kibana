/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { PndRun } from '@kbn/pnd-common';

import { useOpenLifecycle } from '../../../../components/lifecycle_flyout';
import { useWorkflowsDeepLink } from '../../../../hooks/use_workflows_deep_link';
import { isStepLevelDeepLink } from '../helpers/is_step_level_deep_link';
import * as i18n from '../../translations';

export interface RunActionsProps {
  run: PndRun;
}

/**
 * The two ways out of a run row: into the real Workflows execution, and into the
 * four-phase lifecycle.
 *
 * A component rather than a render helper because both affordances are hooks —
 * `useWorkflowsDeepLink` resolves the Workflows app mount (and degrades to no
 * link when Workflows is not installed) and `useOpenLifecycle` pushes the overlay
 * param onto the current location. One instance per row is what lets each row
 * carry its own link.
 *
 * The Workflows link is `href` **plus** an `onClick` that navigates: the href is
 * what makes it a real link (hoverable, copyable, and it survives a Kibana
 * without the Workflows app as a disabled label), while `navigateToApp` is what
 * applies the space prefix and opens the new tab. Never `/app/workflows${path}`.
 */
export const RunActions: React.FC<RunActionsProps> = ({ run }) => {
  const { correlationId, deepLinkPath } = run;
  const { navigate, url } = useWorkflowsDeepLink(deepLinkPath);
  const openLifecycle = useOpenLifecycle(correlationId);
  const isStepLevel = isStepLevelDeepLink(deepLinkPath);

  const onOpenExecution = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      navigate();
    },
    [navigate]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {url != null ? (
          <EuiToolTip
            content={isStepLevel ? i18n.OPEN_EXECUTION_STEP_TOOLTIP : i18n.OPEN_EXECUTION_TOOLTIP}
          >
            <EuiButtonEmpty
              data-step-level={String(isStepLevel)}
              data-test-subj="pndRunOpenExecution"
              flush="both"
              href={url}
              iconSide="right"
              iconType="popout"
              onClick={onOpenExecution}
              size="xs"
              target="_blank"
            >
              {isStepLevel ? i18n.OPEN_EXECUTION_STEP : i18n.OPEN_EXECUTION}
            </EuiButtonEmpty>
          </EuiToolTip>
        ) : (
          <EuiText color="subdued" data-test-subj="pndRunOpenExecutionUnavailable" size="xs">
            {i18n.OPEN_EXECUTION_UNAVAILABLE}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {correlationId.length > 0 ? (
          <EuiButtonEmpty
            data-test-subj="pndRunViewLifecycle"
            flush="both"
            iconType="inspect"
            onClick={openLifecycle}
            size="xs"
          >
            {i18n.VIEW_LIFECYCLE}
          </EuiButtonEmpty>
        ) : (
          <EuiText color="subdued" data-test-subj="pndRunUncorrelated" size="xs">
            {i18n.UNCORRELATED_RUN}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
