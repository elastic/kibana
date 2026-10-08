/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Immutable, PolicyConfig } from '../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem, ProtectionModes } from '../../../../../../../common/endpoint/types';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { MemoryProtectionOSes } from '../../../types';
import { PerOsSettingCard } from './per_os_setting_card';
import { SettingLockedCard } from '../components/setting_locked_card';
import {
  CUSTOM_YARA_SIGNATURES_HINT,
  CUSTOM_YARA_SIGNATURES_LABEL,
  CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL,
} from '../components/shared_translations';
import { useGetProtectionsUnavailableComponent } from '../hooks/use_get_protections_unavailable_component';
import type { UseIsCustomYaraSignaturesAvailableResult } from '../hooks/use_is_custom_yara_signatures_available';
import { useIsCustomYaraSignaturesAvailable } from '../hooks/use_is_custom_yara_signatures_available';
import type { PolicyFormComponentCommonProps } from '../types';
import { OsProtectionModeSelect } from './os_protection_mode_select';
import { OsRow, POLICY_OS_TO_OPERATING_SYSTEM } from './os_row';
import { POLICY_SETTING_SECTION_DESCRIPTIONS } from './policy_setting_section_descriptions';
import { PerOsNotifyUserOption } from './per_os_notify_user_option';
import type { PerOsPolicyAccessor } from './policy_accessor';
import { createMemoryProtectionPolicyAccessor } from './policy_accessor';
import type { PerOsProtectionSideEffectOptions } from './per_os_protection_master_toggle';
import { PerOsProtectionMasterToggle } from './per_os_protection_master_toggle';
import type { PerOsProtectionModeChangeSideEffectOptions } from './use_protection_mode_change_handler';
import { useProtectionModeChangeHandler } from './use_protection_mode_change_handler';

export const LOCKED_CARD_MEMORY_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.memory',
  {
    defaultMessage: 'Memory Threat',
  }
);

const MEMORY_PROTECTION_OS_VALUES: Immutable<MemoryProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

/**
 * Custom YARA signatures follow an OS's memory threat protection being turned on or off, but only
 * while the feature is available: `true` would fail license validation, and `false` would record
 * an opt-out the user never made. When license is the only blocker, a leftover `true` is still
 * cleared because the server rejects it with a 403 on save; when the flag or product feature is
 * off, the server strips it by itself, so the field is left untouched.
 */
const adjustCustomYaraSignaturesForOs = (
  osPolicy: PolicyConfig[MemoryProtectionOSes],
  value: boolean,
  {
    isAvailable,
    isGatedByLicenseOnly,
  }: Pick<UseIsCustomYaraSignaturesAvailableResult, 'isAvailable' | 'isGatedByLicenseOnly'>
): void => {
  if (isAvailable) {
    osPolicy.memory_protection.custom_yara_signatures = value;
  } else if (isGatedByLicenseOnly && osPolicy.memory_protection.custom_yara_signatures) {
    osPolicy.memory_protection.custom_yara_signatures = false;
  }
};

export type PerOsMemoryProtectionCardProps = PolicyFormComponentCommonProps;

export const PerOsMemoryProtectionCard = memo(
  ({
    policy,
    onChange,
    mode = 'edit',
    'data-test-subj': dataTestSubj,
  }: PerOsMemoryProtectionCardProps) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const { isAvailable, isGatedByLicenseOnly } = useIsCustomYaraSignaturesAvailable();
    const selected = MEMORY_PROTECTION_OS_VALUES.some(
      (os) => policy[os].memory_protection.mode !== ProtectionModes.off
    );
    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.memory',
      {
        defaultMessage: 'Memory threat protections',
      }
    );

    const adjustCustomYaraSignaturesOnSwitchChange = useCallback(
      ({ value, osPolicy }: PerOsProtectionSideEffectOptions) => {
        adjustCustomYaraSignaturesForOs(osPolicy, value, { isAvailable, isGatedByLicenseOnly });
      },
      [isAvailable, isGatedByLicenseOnly]
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard title={LOCKED_CARD_MEMORY_TITLE} data-test-subj={getTestId('locked')} />
      );
    }

    return (
      <PerOsSettingCard
        title={i18n.translate('xpack.securitySolution.endpoint.policy.details.memory_protection', {
          defaultMessage: 'Memory threat',
        })}
        description={POLICY_SETTING_SECTION_DESCRIPTIONS.memoryThreat}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <PerOsProtectionMasterToggle
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection="memory_protection"
            protectionLabel={protectionLabel}
            osList={MEMORY_PROTECTION_OS_VALUES}
            additionalOnOsSwitchChange={adjustCustomYaraSignaturesOnSwitchChange}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        {MEMORY_PROTECTION_OS_VALUES.map((os, index) => {
          const accessor = createMemoryProtectionPolicyAccessor(policy, os);
          return (
            <PerOsMemoryProtectionRow
              key={os}
              os={os}
              accessor={accessor}
              onChange={onChange}
              mode={mode}
              isLast={index === MEMORY_PROTECTION_OS_VALUES.length - 1}
              data-test-subj={getTestId(os)}
            />
          );
        })}
      </PerOsSettingCard>
    );
  }
);
PerOsMemoryProtectionCard.displayName = 'PerOsMemoryProtectionCard';

interface PerOsMemoryProtectionRowProps {
  os: MemoryProtectionOSes;
  accessor: PerOsPolicyAccessor<MemoryProtectionOSes>;
  onChange: PolicyFormComponentCommonProps['onChange'];
  mode: 'edit' | 'view';
  'data-test-subj'?: string;
  isLast: boolean;
}

const PerOsMemoryProtectionRow = memo<PerOsMemoryProtectionRowProps>(
  ({ os, accessor, onChange, mode, 'data-test-subj': dataTestSubj, isLast }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
      'customYaraSignaturesEnabled'
    );
    const { isAvailable, isGatedByLicenseOnly, upsellMessage } =
      useIsCustomYaraSignaturesAvailable();
    const osPolicy = accessor.read();
    const memoryProtectionMode = osPolicy.memory_protection.mode;
    const subfeaturesVisible = memoryProtectionMode !== ProtectionModes.off;

    // Only a change into or out of Disable turns the protection on or off; switching between
    // Detect and Prevent keeps the user's custom YARA signatures choice.
    const adjustCustomYaraSignaturesOnModeChange = useCallback(
      ({
        previousMode,
        nextMode,
        osPolicy: updatedOsPolicy,
      }: PerOsProtectionModeChangeSideEffectOptions<'memory_protection'>) => {
        const wasOff = previousMode === ProtectionModes.off;
        const isOff = nextMode === ProtectionModes.off;

        if (wasOff !== isOff) {
          adjustCustomYaraSignaturesForOs(updatedOsPolicy, !isOff, {
            isAvailable,
            isGatedByLicenseOnly,
          });
        }
      },
      [isAvailable, isGatedByLicenseOnly]
    );
    const handleModeChange = useProtectionModeChangeHandler(
      accessor,
      'memory_protection',
      onChange,
      adjustCustomYaraSignaturesOnModeChange
    );

    return (
      <OsRow
        os={POLICY_OS_TO_OPERATING_SYSTEM[os]}
        primaryControl={
          <OsProtectionModeSelect
            mode={memoryProtectionMode}
            onModeChange={handleModeChange}
            disabled={mode !== 'edit'}
            data-test-subj={getTestId('mode')}
          />
        }
        inlineControls={
          isCustomYaraSignaturesEnabled && subfeaturesVisible ? (
            <PerOsCustomYaraSignaturesSwitch
              accessor={accessor}
              onChange={onChange}
              mode={mode}
              isAvailable={isAvailable}
              upsellMessage={upsellMessage}
              data-test-subj={getTestId('customYaraSignatures')}
            />
          ) : undefined
        }
        isLast={isLast}
        data-test-subj={getTestId()}
      >
        {subfeaturesVisible && (
          <PerOsNotifyUserOption
            accessor={accessor}
            onChange={onChange}
            mode={mode}
            protection="memory_protection"
            data-test-subj={getTestId('notifyUser')}
          />
        )}
      </OsRow>
    );
  }
);
PerOsMemoryProtectionRow.displayName = 'PerOsMemoryProtectionRow';

interface PerOsCustomYaraSignaturesSwitchProps {
  accessor: PerOsPolicyAccessor<MemoryProtectionOSes>;
  onChange: PolicyFormComponentCommonProps['onChange'];
  mode: 'edit' | 'view';
  isAvailable: boolean;
  upsellMessage: string | undefined;
  'data-test-subj'?: string;
}

const PerOsCustomYaraSignaturesSwitch = memo<PerOsCustomYaraSignaturesSwitchProps>(
  ({ accessor, onChange, mode, isAvailable, upsellMessage, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const checked = Boolean(accessor.read().memory_protection.custom_yara_signatures);
    const tooltipContent = isAvailable
      ? CUSTOM_YARA_SIGNATURES_HINT
      : upsellMessage ?? CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL;

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const updatedPolicy = accessor.update((currentOsPolicy) => {
          currentOsPolicy.memory_protection.custom_yara_signatures = event.target.checked;
        });
        onChange({ isValid: true, updatedPolicy });
      },
      [accessor, onChange]
    );

    return (
      <EuiFlexGroup gutterSize="xs" data-test-subj={getTestId()}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={CUSTOM_YARA_SIGNATURES_LABEL}
            checked={checked}
            onChange={handleSwitchChange}
            disabled={!isAvailable || mode !== 'edit'}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            position="right"
            content={tooltipContent}
            anchorProps={{ 'data-test-subj': getTestId('tooltipIcon') }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PerOsCustomYaraSignaturesSwitch.displayName = 'PerOsCustomYaraSignaturesSwitch';
