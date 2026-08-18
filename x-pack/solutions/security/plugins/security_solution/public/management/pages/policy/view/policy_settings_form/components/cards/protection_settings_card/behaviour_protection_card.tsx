/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { useGetProtectionsUnavailableComponent } from '../../../hooks/use_get_protections_unavailable_component';
import { useProtectionMasterOffDisplaySnapshot } from '../../../hooks/use_protection_master_off_display_snapshot';
import { useProtectionSectionSelected } from '../../../hooks/use_protection_section_selected';
import { ReputationService } from './components/reputation_service';
import { useTestIdGenerator } from '../../../../../../../hooks/use_test_id_generator';
import { SettingCard } from '../../setting_card';
import { NotifyUserOption } from '../../notify_user_option';
import { OsProtectionRow } from '../../os_protection_row';
import { OsProtectionModeSelect } from '../../os_protection_mode_select';
import { ProtectionSettingCardSwitch } from '../../protection_setting_card_switch';
import type { Immutable } from '../../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../../common/endpoint/types';
import type { BehaviorProtectionOSes } from '../../../../../types';
import { useLicense } from '../../../../../../../../common/hooks/use_license';
import { BEHAVIOR_POLICY_SECTION_DESCRIPTION } from '../../policy_setting_section_descriptions';
import { SettingLockedCard } from '../../setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../../../types';

export const LOCKED_CARD_BEHAVIOR_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.behavior',
  { defaultMessage: 'Malicious behavior' }
);

const BEHAVIOUR_OS_VALUES: Immutable<BehaviorProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

const BEHAVIOUR_OS_LIST: ReadonlyArray<{
  os: BehaviorProtectionOSes;
  operatingSystem: OperatingSystem;
}> = [
  { os: PolicyOperatingSystem.windows, operatingSystem: OperatingSystem.WINDOWS },
  { os: PolicyOperatingSystem.mac, operatingSystem: OperatingSystem.MAC },
  { os: PolicyOperatingSystem.linux, operatingSystem: OperatingSystem.LINUX },
];

export type BehaviourProtectionCardProps = PolicyFormComponentCommonProps;

export const BehaviourProtectionCard = memo<BehaviourProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const protection = 'behavior_protection';

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.behavior',
      { defaultMessage: 'Malicious behavior protections' }
    );

    const { sectionSelected: selected, onSectionActiveChange } = useProtectionSectionSelected(
      policy,
      protection,
      BEHAVIOUR_OS_VALUES
    );

    const { masterOffDisplayModes, setMasterOffDisplayModes } =
      useProtectionMasterOffDisplaySnapshot(selected);

    const [masterOffReputationByOs, setMasterOffReputationByOs] =
      useState<Partial<Record<'windows' | 'mac' | 'linux', boolean>>>();

    useEffect(() => {
      if (selected) {
        setMasterOffReputationByOs(undefined);
      }
    }, [selected]);

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_BEHAVIOR_TITLE}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.behavior_protection', {
          defaultMessage: 'Malicious behavior',
        })}
        selected={selected}
        mode={mode}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        sectionDescription={BEHAVIOR_POLICY_SECTION_DESCRIPTION}
        dataTestSubj={getTestId()}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={BEHAVIOUR_OS_VALUES}
            data-test-subj={getTestId('enableDisableSwitch')}
            onSectionActiveChange={onSectionActiveChange}
            onMasterSwitchTurnedOff={(_savedModes, policyBeforeToggle) => {
              setMasterOffDisplayModes({
                windows: policyBeforeToggle.windows[protection].mode,
                mac: policyBeforeToggle.mac[protection].mode,
                linux: policyBeforeToggle.linux[protection].mode,
              });
              setMasterOffReputationByOs({
                windows: policyBeforeToggle.windows.behavior_protection.reputation_service,
                mac: policyBeforeToggle.mac.behavior_protection.reputation_service,
                linux: policyBeforeToggle.linux.behavior_protection.reputation_service,
              });
            }}
          />
        }
      >
        {BEHAVIOUR_OS_LIST.map(({ os, operatingSystem }, index) => {
          const displayModeForDetailedUi = selected
            ? policy[os][protection].mode
            : masterOffDisplayModes?.[os] ?? policy[os][protection].mode;
          const showOsDetailedSettings =
            displayModeForDetailedUi === ProtectionModes.detect ||
            displayModeForDetailedUi === ProtectionModes.prevent;

          return (
            <OsProtectionRow
              key={os}
              os={operatingSystem}
              isLast={index === BEHAVIOUR_OS_LIST.length - 1}
              data-test-subj={getTestId(`${os}Row`)}
            >
              <EuiFlexGroup gutterSize="l" alignItems="center" wrap responsive={false}>
                <EuiFlexItem grow={false}>
                  <OsProtectionModeSelect
                    os={os}
                    protection={protection}
                    policy={policy}
                    onChange={onChange}
                    mode={mode}
                    displayModeWhenPolicyOff={masterOffDisplayModes?.[os]}
                    sectionFeatureEnabled={selected}
                    data-test-subj={getTestId(`${os}ModeSelect`)}
                  />
                </EuiFlexItem>
                {showOsDetailedSettings && (
                  <EuiFlexItem grow={false}>
                    <ReputationService
                      policy={policy}
                      onChange={onChange}
                      mode={mode}
                      protection={protection}
                      os={os}
                      ghostProtectionMode={masterOffDisplayModes?.[os]}
                      ghostReputationEnabled={masterOffReputationByOs?.[os]}
                      sectionFeatureEnabled={selected}
                      data-test-subj={getTestId(`${os}ReputationService`)}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {showOsDetailedSettings && (
                <NotifyUserOption
                  policy={policy}
                  onChange={onChange}
                  mode={mode}
                  protection={protection}
                  os={os}
                  sectionFeatureEnabled={selected}
                  data-test-subj={getTestId(`${os}NotifyUser`)}
                />
              )}
            </OsProtectionRow>
          );
        })}
      </SettingCard>
    );
  }
);
BehaviourProtectionCard.displayName = 'BehaviourProtectionCard';
