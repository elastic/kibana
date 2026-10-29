/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useGetProtectionsUnavailableComponent } from '../hooks/use_get_protections_unavailable_component';
import { useIsRegistryCredentialHardeningAvailable } from '../hooks/use_is_registry_credential_hardening_available';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../components/setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../types';
import { PerOsSettingCard } from './per_os_setting_card';
import {
  REGISTRY_CREDENTIAL_HARDENING_HINT,
  REGISTRY_CREDENTIAL_HARDENING_LICENSE_UPSELL,
  REGISTRY_CREDENTIAL_HARDENING_SWITCH_LABEL,
} from '../components/shared_translations';
import { OsRow } from './os_row';
import { POLICY_SETTING_SECTION_DESCRIPTIONS } from './policy_setting_section_descriptions';

export const ATTACK_SURFACE_REDUCTION_CARD_TITLE = i18n.translate(
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

export type PerOsAttackSurfaceReductionCardProps = PolicyFormComponentCommonProps;

export const PerOsAttackSurfaceReductionCard = memo<PerOsAttackSurfaceReductionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const {
      isVisible: isRegistryCredentialHardeningVisible,
      isAvailable: isRegistryCredentialHardeningAvailable,
      upsellMessage: registryCredentialHardeningUpsellMessage,
    } = useIsRegistryCredentialHardeningAvailable();
    // Windows-only field: there is no per-OS ASR factory. Read/write the card-level
    // policy's `windows` branch directly rather than reuse a protection accessor.
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
          title={ATTACK_SURFACE_REDUCTION_CARD_TITLE}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <PerOsSettingCard
        title={ATTACK_SURFACE_REDUCTION_CARD_TITLE}
        description={POLICY_SETTING_SECTION_DESCRIPTIONS.attackSurfaceReduction}
        dataTestSubj={getTestId()}
        mode={mode}
      >
        <OsRow
          os={OperatingSystem.WINDOWS}
          primaryControl={
            <EuiSwitch
              label={SWITCH_LABEL}
              checked={isChecked}
              disabled={!isEditMode}
              onChange={handleSwitchChange}
              data-test-subj={getTestId('windows-enableDisableSwitch')}
              labelProps={{ 'data-test-subj': getTestId('windows-switchLabel') }}
            />
          }
          inlineControls={
            isRegistryCredentialHardeningVisible ? (
              <EuiFlexGroup
                gutterSize="xs"
                data-test-subj={getTestId('windows-registryCredentialHardening')}
              >
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={REGISTRY_CREDENTIAL_HARDENING_SWITCH_LABEL}
                    checked={
                      policy.windows.attack_surface_reduction.registry_credential_hardening
                        ?.enabled ?? false
                    }
                    disabled={!isEditMode || !isRegistryCredentialHardeningAvailable}
                    onChange={handleRegistryCredentialHardeningSwitchChange}
                    data-test-subj={getTestId('windows-registryCredentialHardeningSwitch')}
                    labelProps={{
                      'data-test-subj': getTestId('windows-registryCredentialHardeningSwitchLabel'),
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
                      'data-test-subj': getTestId('windows-registryCredentialHardeningTooltipIcon'),
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : undefined
          }
          isLast={true}
          data-test-subj={getTestId('windows')}
        />
      </PerOsSettingCard>
    );
  }
);
PerOsAttackSurfaceReductionCard.displayName = 'PerOsAttackSurfaceReductionCard';
