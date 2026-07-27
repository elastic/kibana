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

import type { EntityAnalyticsStatus } from '../hooks/use_entity_analytics_status';
import { useToggleEntityAnalytics } from '../hooks/use_toggle_entity_analytics';
import * as i18n from '../translations';
import {
  ENTITY_ANALYTICS_HEALTH_TEST_ID,
  ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID,
  ENTITY_ANALYTICS_SWITCH_TEST_ID,
  ENTITY_ANALYTICS_STATUS_LOADING_TEST_ID,
} from '../test_ids';

export const EntityAnalyticsHealth: React.FC<{ status: EntityAnalyticsStatus }> = ({ status }) => {
  const isOn = status === 'enabled';
  return (
    <EuiHealth
      textSize="m"
      color={isOn ? 'success' : 'subdued'}
      data-test-subj={ENTITY_ANALYTICS_HEALTH_TEST_ID}
    >
      {isOn ? i18n.ENTITY_ANALYTICS_STATUS_ON : i18n.ENTITY_ANALYTICS_STATUS_OFF}
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
        data-test-subj={ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID}
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
  hasEnablementPrivileges: boolean;
  hasStopPrivileges: boolean;
  isPrivilegesLoading: boolean;
  selectedSettingsMatchSavedSettings: boolean;
  onSaveSettings: () => Promise<void>;
  isSavingSettings: boolean;
}

export const EntityAnalyticsToggle: React.FC<EntityAnalyticsToggleProps> = ({
  hasEnablementPrivileges,
  hasStopPrivileges,
  isPrivilegesLoading,
  selectedSettingsMatchSavedSettings,
  onSaveSettings,
  isSavingSettings,
}) => {
  const { status, isLoading, isStatusLoading, toggle, errors } = useToggleEntityAnalytics({
    selectedSettingsMatchSavedSettings,
    onSaveSettings,
    isSavingSettings,
  });

  const isChecked = status === 'enabled';

  // Turning the toggle ON installs/starts the Entity Store and inits/enables the risk score
  // maintainer, so it requires the full enablement privilege set. Turning it OFF stops engines
  // via user-scoped SO updates on entity-engine-descriptor-v2,
  // so it requires SO write privileges, but not the full ES/cluster install set.
  const isDisabled =
    isPrivilegesLoading ||
    isStatusLoading ||
    status === 'enabling' ||
    status === 'error' ||
    (isChecked ? !hasStopPrivileges : !hasEnablementPrivileges);

  return (
    <>
      <EntityAnalyticsErrorPanel
        riskEngineErrors={errors.riskEngine}
        entityStoreErrors={errors.entityStore}
      />
      <EuiSpacer size="m" />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {(isLoading || isStatusLoading) && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                data-test-subj={ENTITY_ANALYTICS_STATUS_LOADING_TEST_ID}
                size="m"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EntityAnalyticsHealth status={status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.ENTITY_ANALYTICS_STATUS}
              data-test-subj={ENTITY_ANALYTICS_SWITCH_TEST_ID}
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
