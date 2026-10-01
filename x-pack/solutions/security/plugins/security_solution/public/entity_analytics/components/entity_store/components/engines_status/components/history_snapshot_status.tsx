/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  type EuiSwitchEvent,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import type { EngineComponentStatus } from '../../../../../../../common/api/entity_analytics';
import { useErrorToast } from '../../../../../../common/hooks/use_error_toast';
import {
  HISTORY_SNAPSHOT_STATUS_TEST_ID,
  HISTORY_SNAPSHOT_SWITCH_TEST_ID,
} from '../../../../../test_ids';
import {
  useDisableHistorySnapshotMutation,
  useEnableHistorySnapshotMutation,
} from '../../../hooks/use_entity_store';
import { EngineComponentsStatusTable } from './engine_components_status';

type HistorySnapshotStatusResponse = NonNullable<GetEntityStoreStatusResponse['historySnapshot']>;

const enableErrorTitle = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.historySnapshot.enableError',
  { defaultMessage: 'There was an error enabling the history snapshot task' }
);

const disableErrorTitle = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.historySnapshot.disableError',
  { defaultMessage: 'There was an error disabling the history snapshot task' }
);

const lastErrorTitle = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.historySnapshot.lastErrorTitle',
  { defaultMessage: 'Last error' }
);

const toggleLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.historySnapshot.toggleLabel',
  { defaultMessage: 'Enable history snapshot' }
);

const withTaskStatus = (
  historySnapshot: HistorySnapshotStatusResponse,
  component: EngineComponentStatus
): EngineComponentStatus => {
  if (component.resource !== 'task') {
    return component;
  }

  if (historySnapshot.lastError) {
    return {
      ...component,
      health: 'red',
      errors: [{ title: lastErrorTitle, message: historySnapshot.lastError.message }],
    };
  }

  if (historySnapshot.status === 'stopped') {
    return { ...component, health: 'unknown' };
  }

  return component;
};

export const HistorySnapshotStatus = ({
  historySnapshot,
}: {
  historySnapshot: HistorySnapshotStatusResponse;
}) => {
  const enableMutation = useEnableHistorySnapshotMutation();
  const disableMutation = useDisableHistorySnapshotMutation();
  const isToggling = enableMutation.isLoading || disableMutation.isLoading;
  const isStarted = historySnapshot.status === 'started';
  const checked = isToggling ? !isStarted : isStarted;

  useErrorToast(enableErrorTitle, enableMutation.error);
  useErrorToast(disableErrorTitle, disableMutation.error);

  const components = useMemo(
    () =>
      (historySnapshot.components ?? []).map((component) =>
        withTaskStatus(historySnapshot, component)
      ),
    [historySnapshot]
  );

  const onToggle = (event: EuiSwitchEvent) => {
    if (event.target.checked) {
      enableMutation.mutate();
      return;
    }
    disableMutation.mutate();
  };

  return (
    <div data-test-subj={HISTORY_SNAPSHOT_STATUS_TEST_ID}>
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.historySnapshot.title"
                defaultMessage="History Snapshot"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {isToggling && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" data-test-subj="history-snapshot-switch-loading" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={toggleLabel}
                showLabel={false}
                checked={checked}
                onChange={onToggle}
                disabled={isToggling}
                compressed
                data-test-subj={HISTORY_SNAPSHOT_SWITCH_TEST_ID}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {historySnapshot.components && (
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EngineComponentsStatusTable components={components} />
        </EuiPanel>
      )}
    </div>
  );
};
