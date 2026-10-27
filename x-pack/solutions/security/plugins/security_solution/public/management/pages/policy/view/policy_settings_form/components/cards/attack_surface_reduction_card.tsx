/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useIsRegistryCredentialHardeningAvailable } from '../../hooks/use_is_registry_credential_hardening_available';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';
import {
  REGISTRY_CREDENTIAL_HARDENING_HINT,
  REGISTRY_CREDENTIAL_HARDENING_LICENSE_UPSELL,
  REGISTRY_CREDENTIAL_HARDENING_SWITCH_LABEL,
} from '../shared_translations';

const ATTACK_SURFACE_OS_LIST = [OperatingSystem.WINDOWS];

export const LOCKED_CARD_ATTACK_SURFACE_REDUCTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.attack_surface_reduction',
  {
    defaultMessage: 'Attack Surface Reduction',
  }
);

const CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.attackSurfaceReduction.type',
  {
    defaultMessage: 'Attack surface reduction',
  }
);

export const SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.credentialHardening',
  {
    defaultMessage: 'Credential hardening',
  }
);

export type AttackSurfaceReductionCardProps = PolicyFormComponentCommonProps;

export const AttackSurfaceReductionCard = memo<AttackSurfaceReductionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const {
      isVisible: isRegistryCredentialHardeningVisible,
      isAvailable: isRegistryCredentialHardeningAvailable,
      upsellMessage: registryCredentialHardeningUpsellMessage,
    } = useIsRegistryCredentialHardeningAvailable();
    const isChecked = policy.windows.attack_surface_reduction.credential_hardening.enabled;
    const isEditMode = mode === 'edit';

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const updatedPolicy = cloneDeep(policy);

        updatedPolicy.windows.attack_surface_reduction.credential_hardening.enabled =
          event.target.checked;

        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, policy]
    );

    const handleRegistryCredentialHardeningSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const updatedPolicy = cloneDeep(policy);

        updatedPolicy.windows.attack_surface_reduction.registry_credential_hardening = {
          enabled: event.target.checked,
        };

        onChange({ isValid: true, updatedPolicy });
      },
      [onChange, policy]
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_ATTACK_SURFACE_REDUCTION}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={CARD_TITLE}
        supportedOss={ATTACK_SURFACE_OS_LIST}
        dataTestSubj={getTestId()}
      >
        <EuiSwitch
          label={SWITCH_LABEL}
          checked={isChecked}
          disabled={!isEditMode}
          onChange={handleSwitchChange}
          data-test-subj={getTestId('enableDisableSwitch')}
          labelProps={{ 'data-test-subj': getTestId('switchLabel') }}
        />

        {isRegistryCredentialHardeningVisible && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs" data-test-subj={getTestId('registryCredentialHardening')}>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={REGISTRY_CREDENTIAL_HARDENING_SWITCH_LABEL}
                  checked={
                    policy.windows.attack_surface_reduction.registry_credential_hardening
                      ?.enabled ?? false
                  }
                  disabled={!isEditMode || !isRegistryCredentialHardeningAvailable}
                  onChange={handleRegistryCredentialHardeningSwitchChange}
                  data-test-subj={getTestId('registryCredentialHardeningSwitch')}
                  labelProps={{
                    'data-test-subj': getTestId('registryCredentialHardeningSwitchLabel'),
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  position="right"
                  content={
                    isRegistryCredentialHardeningAvailable
                      ? REGISTRY_CREDENTIAL_HARDENING_HINT
                      : registryCredentialHardeningUpsellMessage ??
                        REGISTRY_CREDENTIAL_HARDENING_LICENSE_UPSELL
                  }
                  anchorProps={{
                    'data-test-subj': getTestId('registryCredentialHardeningTooltipIcon'),
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </SettingCard>
    );
  }
);
AttackSurfaceReductionCard.displayName = 'AttackSurfaceReductionCard';
