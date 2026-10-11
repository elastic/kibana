/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiToolTip,
  type EuiSwitchEvent,
} from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useArtifactActionsDisabled } from '../../../hooks/artifacts';
import { isArtifactDisabled } from '../../../../../common/endpoint/service/artifacts';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import {
  type ARTIFACT_ENABLE_DISABLE_ACTION_LABELS,
  useWithArtifactEnableDisable,
} from '../hooks/use_with_artifact_enable_disable';

export interface ArtifactEnabledSwitchProps {
  item: ExceptionListItemSchema;
  apiClient: ExceptionsListApiClient;
  labels: {
    tableColumnEnabledLabel: string;
    tableEnabledStatusLabel: string;
    tableDisabledStatusLabel: string;
  } & typeof ARTIFACT_ENABLE_DISABLE_ACTION_LABELS;
  isReadOnly?: boolean;
  onSuccess?: () => Promise<void>;
  'data-test-subj'?: string;
}

export const ArtifactEnabledSwitch = memo<ArtifactEnabledSwitchProps>(
  ({ item, apiClient, labels, isReadOnly = false, onSuccess, 'data-test-subj': dataTestSubj }) => {
    const isMounted = useIsMounted();
    const { isDisabled: isActionDisabled } = useArtifactActionsDisabled(item);
    const { setArtifactEnabled, isLoading } = useWithArtifactEnableDisable(apiClient, item, labels);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isEnabled = !isArtifactDisabled(item);
    const isBusy = isLoading || isRefreshing;

    // Keep the switch enabled in the DOM while busy so keyboard focus is not lost. onChange is ignored until pending work settles.
    const isSwitchDisabled = isReadOnly || isActionDisabled;
    const statusLabel = isEnabled
      ? labels.tableEnabledStatusLabel
      : labels.tableDisabledStatusLabel;

    const handleChange = useCallback(
      (event: EuiSwitchEvent) => {
        if (isSwitchDisabled || isBusy) {
          return;
        }

        setIsRefreshing(true);

        // mutateAsync rethrows after onError; swallow so failed updates are not unhandled rejections.
        setArtifactEnabled(event.target.checked)
          .then(() => onSuccess?.())
          .catch(() => undefined)
          .finally(() => {
            if (isMounted()) {
              setIsRefreshing(false);
            }
          });
      },
      [isBusy, isMounted, isSwitchDisabled, onSuccess, setArtifactEnabled]
    );

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        aria-busy={isBusy || undefined}
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip content={statusLabel}>
            <EuiSwitch
              label={labels.tableColumnEnabledLabel}
              showLabel={false}
              checked={isEnabled}
              disabled={isSwitchDisabled}
              onChange={handleChange}
              data-test-subj={dataTestSubj}
            />
          </EuiToolTip>
        </EuiFlexItem>
        {isBusy && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" data-test-subj={`${dataTestSubj}-loading`} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
ArtifactEnabledSwitch.displayName = 'ArtifactEnabledSwitch';
