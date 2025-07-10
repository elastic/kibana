/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiSwitch,
  EuiLoadingSpinner,
  EuiText,
  EuiCallOut,
  EuiAccordion,
} from '@elastic/eui';
import type { UseMutationResult } from '@tanstack/react-query';
import type { RiskEngineStatus } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import * as i18n from '../../translations';
import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../../api/hooks/use_disable_risk_engine_mutation';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { RiskEngineMissingPrivilegesResponse } from '../../hooks/use_missing_risk_engine_privileges';
import { useInvalidateRiskEngineSettingsQuery } from './hooks/risk_score_configurable_risk_engine_settings_hooks';

const MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING = '50px';
const toastOptions = {
  toastLifeTimeMs: 5000,
};

const RiskScoreErrorPanel = ({ errors }: { errors: string[] }) => (
  <>
    <EuiSpacer size="m" />
    <EuiCallOut
      title={i18n.ERROR_PANEL_TITLE}
      color="danger"
      iconType="error"
      data-test-subj="risk-score-error-panel"
    >
      <p>{i18n.ERROR_PANEL_MESSAGE}</p>

      <EuiAccordion id="risk-engine-erros" buttonContent={i18n.ERROR_PANEL_ERRORS}>
        <>
          {errors.map((error) => (
            <div key={error}>
              <EuiText size="s">{error}</EuiText>
              <EuiSpacer size="s" />
            </div>
          ))}
        </>
      </EuiAccordion>
    </EuiCallOut>
  </>
);

const RiskEngineHealth: React.FC<{ currentRiskEngineStatus?: RiskEngineStatus | null }> = ({
  currentRiskEngineStatus,
}) => {
  if (!currentRiskEngineStatus) {
    return <EuiHealth color="danger">{'-'}</EuiHealth>;
  }
  if (currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED) {
    return <EuiHealth color="success">{i18n.RISK_ENGINE_STATUS_ON}</EuiHealth>;
  }
  return <EuiHealth color="danger">{i18n.RISK_ENGINE_STATUS_OFF}</EuiHealth>;
};

const RiskEngineStatusRow: React.FC<{
  currentRiskEngineStatus?: RiskEngineStatus | null;
  onSwitchClick: () => void;
  isLoading: boolean;
  privileges: RiskEngineMissingPrivilegesResponse;
}> = ({ currentRiskEngineStatus, onSwitchClick, isLoading, privileges }) => {
  const userHasRequiredPrivileges =
    'hasAllRequiredPrivileges' in privileges && privileges.hasAllRequiredPrivileges;
  const btnIsDisabled = !currentRiskEngineStatus || isLoading || !userHasRequiredPrivileges;

  return (
    <EuiFlexGroup gutterSize="s" alignItems={'center'}>
      {isLoading && (
        <EuiFlexItem>
          <EuiLoadingSpinner data-test-subj="risk-score-status-loading" size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={{ minWidth: MIN_WIDTH_TO_PREVENT_LABEL_FROM_MOVING }}
        data-test-subj="risk-score-status"
      >
        <RiskEngineHealth currentRiskEngineStatus={currentRiskEngineStatus} />
      </EuiFlexItem>
      <EuiFlexGroup alignItems={'center'} justifyContent={'center'}>
        <EuiSwitch
          label={i18n.RISK_ENGINE_STATUS_SWITCH_LABEL}
          data-test-subj="risk-score-switch"
          checked={currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED}
          onChange={onSwitchClick}
          disabled={btnIsDisabled}
          aria-describedby={'switchRiskModule'}
          showLabel={false}
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

export const RiskScoreEnableSection: React.FC<{
  privileges: RiskEngineMissingPrivilegesResponse;
  selectedSettingsMatchSavedSettings: boolean;
  saveSelectedSettingsMutation: UseMutationResult<void, unknown, void, unknown>;
}> = ({ privileges, selectedSettingsMatchSavedSettings, saveSelectedSettingsMutation }) => {
  const { addSuccess } = useAppToasts();
  const { data: riskEngineStatus, isFetching: isStatusLoading } = useRiskEngineStatus();
  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();

  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSuccess: async () => {
      await invalidateRiskEngineSettingsQuery();
      addSuccess(i18n.RISK_ENGINE_TURNED_ON, toastOptions);
    },
  });

  const enableRiskEngineMutation = useEnableRiskEngineMutation({
    onSuccess: () => {
      addSuccess(i18n.RISK_ENGINE_TURNED_ON, toastOptions);
    },
  });
  const disableRiskEngineMutation = useDisableRiskEngineMutation({
    onSuccess: () => {
      addSuccess(i18n.RISK_ENGINE_TURNED_OFF, toastOptions);
    },
  });

  const currentRiskEngineStatus = riskEngineStatus?.risk_engine_status;

  const isLoading =
    saveSelectedSettingsMutation.isLoading ||
    initRiskEngineMutation.isLoading ||
    enableRiskEngineMutation.isLoading ||
    disableRiskEngineMutation.isLoading ||
    privileges.isLoading ||
    isStatusLoading;

  const onSwitchClick = async () => {
    if (!currentRiskEngineStatus || isLoading) {
      return;
    }

    if (currentRiskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED) {
      if (!selectedSettingsMatchSavedSettings) {
        await saveSelectedSettingsMutation.mutateAsync();
      }
      await initRiskEngineMutation.mutateAsync();
    } else if (currentRiskEngineStatus === RiskEngineStatusEnum.ENABLED) {
      disableRiskEngineMutation.mutate();
    } else if (currentRiskEngineStatus === RiskEngineStatusEnum.DISABLED) {
      enableRiskEngineMutation.mutate();
    }
  };

  let initRiskEngineErrors: string[] = [];
  if (initRiskEngineMutation.isError) {
    const errorBody = initRiskEngineMutation.error.body;
    initRiskEngineErrors = [errorBody.message];
  }
  return (
    <>
      <>
        {initRiskEngineMutation.isError && <RiskScoreErrorPanel errors={initRiskEngineErrors} />}
        {disableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[disableRiskEngineMutation.error.body.message]} />
        )}
        {enableRiskEngineMutation.isError && (
          <RiskScoreErrorPanel errors={[enableRiskEngineMutation.error.body.message]} />
        )}

        <EuiSpacer size="m" />
        <EuiFlexItem grow={false}>
          <RiskEngineStatusRow
            currentRiskEngineStatus={currentRiskEngineStatus}
            onSwitchClick={onSwitchClick}
            isLoading={isLoading}
            privileges={privileges}
          />
        </EuiFlexItem>
      </>
      <EuiSpacer />
    </>
  );
};
