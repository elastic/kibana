/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { usePndExecution } from '../../../../hooks/use_pnd_execution';
import type { PndContainmentActionRecord } from '../../../../hooks/use_pnd_execution';
import { PndQueryState } from '../../../../states';
import { ContainmentActionStatusBadge } from '../../../containment_action_status_badge';
import * as i18n from '../../translations';

export interface LifecycleActionsSectionProps {
  correlationId: string;
}

interface ContainmentActionRowProps {
  action: PndContainmentActionRecord;
}

/**
 * One ledger entry: what was done, to which kind of target, and how it ended. The reason line
 * carries the ledger's own explanation for a row that did not run — `skipped` and `not_executed`
 * are only legible with it — and a failed row surfaces its compact error message the same way.
 */
const ContainmentActionRow: React.FC<ContainmentActionRowProps> = ({
  action: { actionType, errorMessage, reason, status, title },
}) => (
  <>
    <EuiPanel
      data-status={status}
      data-test-subj="pndLifecycleContainmentAction"
      hasBorder
      hasShadow={false}
      paddingSize="s"
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          {reason != null ? (
            <EuiText color="subdued" data-test-subj="pndLifecycleContainmentActionReason" size="xs">
              {reason}
            </EuiText>
          ) : null}
          {errorMessage != null ? (
            <EuiText color="danger" data-test-subj="pndLifecycleContainmentActionError" size="xs">
              {errorMessage}
            </EuiText>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {actionType != null ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="pndLifecycleContainmentActionType">
                  {actionType}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <ContainmentActionStatusBadge status={status} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
    <EuiSpacer size="xs" />
  </>
);

/**
 * Containment actions: what the `collect_executed_actions` ledger says actually happened after the
 * containment gate was answered — one row per action, with its outcome.
 *
 * A section inside Overview for the same reason Review tuning is (register #49): it is the record
 * of what an approval **did**, so it keeps its own heading and its own
 * `pndLifecycleSection-actions` block rather than being blended into the rows below.
 *
 * Reads the ledger through `usePndExecution`, the single producer for `queryKeys.executions.detail`
 * — the same read `LifecycleSummarySection` and `LifecycleStepsSection` share. Registering a second
 * `queryFn` under that key would silently empty one of the three, depending only on which mounted
 * first.
 *
 * The empty state is the honest answer, not a loss: the route omits the ledger until the gate has
 * been answered and the execute steps have recorded outcomes, so "no containment actions have been
 * executed yet" is exactly what an absent or empty ledger means.
 */
export const LifecycleActionsSection: React.FC<LifecycleActionsSectionProps> = ({
  correlationId,
}) => {
  // an empty id disables the read inside the hook, exactly as the tuning section's queue read does
  const { data, error, isLoading, refetch } = usePndExecution(correlationId);

  const actions = data?.containmentActions ?? [];

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div data-test-subj="pndLifecycleSection-actions">
      <EuiTitle size="xs">
        <h3>{i18n.SECTION_ACTIONS}</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <PndQueryState
        emptyBody={i18n.ACTIONS_EMPTY_BODY}
        emptyTitle={i18n.ACTIONS_EMPTY_TITLE}
        error={error}
        isEmpty={actions.length === 0}
        isLoading={isLoading}
        loadingLabel={i18n.ACTIONS_LOADING}
        onRetry={onRetry}
      >
        {actions.map((action, index) => (
          <ContainmentActionRow action={action} key={`${action.title}-${index}`} />
        ))}
      </PndQueryState>
    </div>
  );
};
