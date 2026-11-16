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
import { i18n } from '@kbn/i18n';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { useArtifactActionsDisabled } from '../../../hooks/artifacts';
import { isArtifactDisabled } from '../../../../../common/endpoint/service/artifacts';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import type { ARTIFACT_ENABLE_DISABLE_ACTION_LABELS } from '../hooks/use_with_artifact_enable_disable';
import { useWithArtifactEnableDisable } from '../hooks/use_with_artifact_enable_disable';

export const ARTIFACT_ENABLED_SWITCH_LABELS = Object.freeze({
  tableColumnEnabledLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.table.columnEnabledLabel',
    { defaultMessage: 'Enabled' }
  ),
  tableEnabledStatusLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.table.enabledStatusLabel',
    { defaultMessage: 'Enabled' }
  ),
  tableDisabledStatusLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.table.disabledStatusLabel',
    { defaultMessage: 'Disabled' }
  ),
});

export interface ArtifactEnabledSwitchProps {
  item: ExceptionListItemSchema;
  apiClient: ExceptionsListApiClient;
  labels: typeof ARTIFACT_ENABLED_SWITCH_LABELS & typeof ARTIFACT_ENABLE_DISABLE_ACTION_LABELS;
  isReadOnly?: boolean;
  /** Reloads the artifact after a successful update or a 409 conflict. */
  onRefresh?: () => Promise<void>;
  'data-test-subj'?: string;
}

const isConflictError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const httpError = error as IHttpFetchError<{ statusCode?: number }>;
  return httpError.response?.status === 409 || httpError.body?.statusCode === 409;
};

export const ArtifactEnabledSwitch = memo<ArtifactEnabledSwitchProps>(
  ({ item, apiClient, labels, isReadOnly = false, onRefresh, 'data-test-subj': dataTestSubj }) => {
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
          .then(() => onRefresh?.())
          .catch((error: unknown) => {
            if (!isConflictError(error)) {
              return undefined;
            }

            return onRefresh?.();
          })
          .catch(() => undefined)
          .finally(() => {
            if (isMounted()) {
              setIsRefreshing(false);
            }
          });
      },
      [isBusy, isMounted, isSwitchDisabled, onRefresh, setArtifactEnabled]
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
