/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { UseMutationResult } from '@kbn/react-query';

import type { RiskEngineMissingPrivilegesResponse } from '../hooks/use_missing_risk_engine_privileges';
import type { EntityAnalyticsStatus } from '../hooks/use_entity_analytics_status';
import { useToggleEntityAnalytics } from '../hooks/use_toggle_entity_analytics';
import { useEntityEnginePrivileges } from './entity_store/hooks/use_entity_engine_privileges';
import * as i18n from '../translations';

export const EntityAnalyticsHealth: React.FC<{ status: EntityAnalyticsStatus }> = ({ status }) => {
  const isOn = status === 'enabled';
  return (
    <EuiHealth
      textSize="m"
      color={isOn ? 'success' : 'subdued'}
      data-test-subj="entity-analytics-health"
    >
      {isOn ? i18n.RISK_ENGINE_STATUS_ON : i18n.RISK_ENGINE_STATUS_OFF}
    </EuiHealth>
  );
};

export const EntityAnalyticsErrorPanel: React.FC<{
  riskEngineErrors: string[];
  entityStoreErrors: string[];
}> = ({ riskEngineErrors, entityStoreErrors }) => {
  const allErrors = [...riskEngineErrors, ...entityStoreErrors];
  if (allErrors.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={i18n.ERROR_PANEL_TITLE}
        color="danger"
        iconType="error"
        data-test-subj="entity-analytics-error-panel"
      >
        <p>{i18n.ERROR_PANEL_MESSAGE}</p>
        <EuiAccordion id="entity-analytics-errors" buttonContent={i18n.ERROR_PANEL_ERRORS}>
          <>
            {allErrors.map((error, index) => (
              <div key={index}>
                <EuiText size="s">{error}</EuiText>
                <EuiSpacer size="s" />
              </div>
            ))}
          </>
        </EuiAccordion>
      </EuiCallOut>
    </>
  );
};

interface EntityAnalyticsToggleProps {
  privileges: RiskEngineMissingPrivilegesResponse;
  selectedSettingsMatchSavedSettings: boolean;
  saveSelectedSettingsMutation: UseMutationResult<void, unknown, void, unknown>;
}

export const EntityAnalyticsToggle: React.FC<EntityAnalyticsToggleProps> = ({
  privileges,
  selectedSettingsMatchSavedSettings,
  saveSelectedSettingsMutation,
}) => {
  const { status, isLoading, toggle, errors } = useToggleEntityAnalytics({
    selectedSettingsMatchSavedSettings,
    saveSelectedSettingsMutation,
  });

  const { data: entityEnginePrivileges } = useEntityEnginePrivileges();

  const userHasRiskEnginePrivileges =
    !privileges.isLoading &&
    'hasAllRequiredPrivileges' in privileges &&
    privileges.hasAllRequiredPrivileges;
  const userHasEntityStorePrivileges = entityEnginePrivileges?.has_all_required ?? false;
  const isMissingAllPrivileges = !userHasRiskEnginePrivileges && !userHasEntityStorePrivileges;

  const isDisabled =
    privileges.isLoading || isMissingAllPrivileges || status === 'enabling' || status === 'error';

  const isChecked = status === 'enabled' || status === 'partially_enabled';

  return (
    <>
      <EntityAnalyticsErrorPanel
        riskEngineErrors={errors.riskEngine}
        entityStoreErrors={errors.entityStore}
      />
      <EuiSpacer size="m" />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="entity-analytics-status-loading" size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EntityAnalyticsHealth status={status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.RISK_ENGINE_STATUS_SWITCH_LABEL}
              data-test-subj="entity-analytics-switch"
              checked={isChecked}
              onChange={toggle}
              disabled={isDisabled}
              showLabel={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer />
    </>
  );
};
