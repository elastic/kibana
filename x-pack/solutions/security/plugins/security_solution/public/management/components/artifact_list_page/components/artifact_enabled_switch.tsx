/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiLoadingSpinner, EuiSwitch, EuiToolTip, type EuiSwitchEvent } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
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
  } & typeof ARTIFACT_ENABLE_DISABLE_ACTION_LABELS;
  isReadOnly?: boolean;
  onSuccess?: () => void;
  'data-test-subj'?: string;
}

export const ArtifactEnabledSwitch = memo<ArtifactEnabledSwitchProps>(
  ({ item, apiClient, labels, isReadOnly = false, onSuccess, 'data-test-subj': dataTestSubj }) => {
    const { isDisabled: isActionDisabled, disabledTooltip } = useArtifactActionsDisabled(item);
    const { setArtifactEnabled, isLoading } = useWithArtifactEnableDisable(apiClient, item, labels);
    const isEnabled = !isArtifactDisabled(item);
    const isSwitchDisabled = isReadOnly || isActionDisabled || isLoading;

    const handleChange = useCallback(
      (event: EuiSwitchEvent) => {
        // mutateAsync rethrows after onError; swallow so failed updates are not unhandled rejections.
        setArtifactEnabled(event.target.checked)
          .then(() => onSuccess?.())
          .catch(() => undefined);
      },
      [onSuccess, setArtifactEnabled]
    );

    if (isLoading) {
      return <EuiLoadingSpinner size="m" data-test-subj={`${dataTestSubj}-loading`} />;
    }

    const switchControl = (
      <EuiSwitch
        label={labels.tableColumnEnabledLabel}
        showLabel={false}
        checked={isEnabled}
        disabled={isSwitchDisabled}
        onChange={handleChange}
        data-test-subj={dataTestSubj}
      />
    );

    if (isActionDisabled && disabledTooltip) {
      return <EuiToolTip content={disabledTooltip}>{switchControl}</EuiToolTip>;
    }

    return switchControl;
  }
);
ArtifactEnabledSwitch.displayName = 'ArtifactEnabledSwitch';
