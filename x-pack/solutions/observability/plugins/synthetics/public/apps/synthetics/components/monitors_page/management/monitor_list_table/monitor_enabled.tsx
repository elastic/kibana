/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSwitch, EuiSwitchEvent, EuiLoadingSpinner } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { ConfigKey, EncryptedSyntheticsMonitor } from '../../../../../../../common/runtime_types';
import {
  useCanEditSynthetics,
  useCanUsePublicLocations,
} from '../../../../../../hooks/use_capabilities';
import { useEnablement, useMonitorEnableHandler } from '../../../../hooks';
import { NoPermissionsTooltip } from '../../../common/components/permissions';
import * as labels from './labels';

interface Props {
  configId: string;
  monitor: EncryptedSyntheticsMonitor;
  reloadPage: () => void;
  initialLoading?: boolean;
  isSwitchable?: boolean;
}

export const MonitorEnabled = ({
  configId,
  monitor,
  reloadPage,
  initialLoading = false,
  isSwitchable = true,
}: Props) => {
  const canEditSynthetics = useCanEditSynthetics();

  const canUsePublicLocations = useCanUsePublicLocations(monitor?.[ConfigKey.LOCATIONS]);

  const { isServiceAllowed } = useEnablement();

  const monitorName = monitor[ConfigKey.NAME];
  const statusLabels = useMemo(() => {
    return {
      failureLabel: labels.getMonitorEnabledUpdateFailureMessage(monitorName),
      enabledSuccessLabel: labels.getMonitorEnabledSuccessLabel(monitorName),
      disabledSuccessLabel: labels.getMonitorDisabledSuccessLabel(monitorName),
    };
  }, [monitorName]);

  const { isEnabled, updateMonitorEnabledState, status } = useMonitorEnableHandler({
    configId,
    isEnabled: monitor[ConfigKey.ENABLED],
    reloadPage,
    labels: statusLabels,
  });

  const enabled = isEnabled ?? monitor[ConfigKey.ENABLED];
  const isLoading = status === FETCH_STATUS.LOADING;

  const handleEnabledChange = (event: EuiSwitchEvent) => {
    const checked = event.target.checked;
    updateMonitorEnabledState(checked);
  };

  const enabledDisableLabel = enabled ? labels.DISABLE_MONITOR_LABEL : labels.ENABLE_MONITOR_LABEL;

  return (
    <>
      {isLoading || initialLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : (
        <NoPermissionsTooltip
          canEditSynthetics={canEditSynthetics}
          canUsePublicLocations={canUsePublicLocations}
        >
          <SwitchWithCursor
            compressed={true}
            checked={enabled}
            disabled={
              isLoading || !canEditSynthetics || !canUsePublicLocations || !isServiceAllowed
            }
            showLabel={false}
            label={enabledDisableLabel}
            title={enabledDisableLabel}
            data-test-subj="syntheticsIsMonitorEnabled"
            data-is-switchable={isSwitchable}
            onChange={handleEnabledChange}
          />
        </NoPermissionsTooltip>
      )}
    </>
  );
};

// data-* is the DOM compatible prop format
const SwitchWithCursor = euiStyled(EuiSwitch)<{ 'data-is-switchable': boolean }>`
  & > button {
    cursor: ${({ 'data-is-switchable': isSwitchable }) =>
      isSwitchable ? undefined : 'not-allowed'};
  }
`;
