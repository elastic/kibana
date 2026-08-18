/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useProtectionMasterOffDisplaySnapshot } from '../../hooks/use_protection_master_off_display_snapshot';
import { useProtectionSectionSelected } from '../../hooks/use_protection_section_selected';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { NotifyUserOption } from '../notify_user_option';
import { OsProtectionRow } from '../os_protection_row';
import { OsProtectionModeSelect } from '../os_protection_mode_select';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { SettingLockedCard } from '../setting_locked_card';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../common/endpoint/types';
import type { MemoryProtectionOSes } from '../../../../types';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';
import { MEMORY_THREAT_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';

export const LOCKED_CARD_MEMORY_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.memory',
  { defaultMessage: 'Memory Threat' }
);

const MEMORY_PROTECTION_OS_VALUES: Immutable<MemoryProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

const MEMORY_OS_LIST: ReadonlyArray<{
  os: MemoryProtectionOSes;
  operatingSystem: OperatingSystem;
}> = [
  { os: PolicyOperatingSystem.windows, operatingSystem: OperatingSystem.WINDOWS },
  { os: PolicyOperatingSystem.mac, operatingSystem: OperatingSystem.MAC },
  { os: PolicyOperatingSystem.linux, operatingSystem: OperatingSystem.LINUX },
];

export type MemoryProtectionCardProps = PolicyFormComponentCommonProps;

export const MemoryProtectionCard = memo<MemoryProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const protection = 'memory_protection';

    const { sectionSelected: selected, onSectionActiveChange } = useProtectionSectionSelected(
      policy,
      protection,
      MEMORY_PROTECTION_OS_VALUES
    );

    const { masterOffDisplayModes, setMasterOffDisplayModes } =
      useProtectionMasterOffDisplaySnapshot(selected);

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.memory',
      { defaultMessage: 'Memory threat protections' }
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
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.memory_protection', {
          defaultMessage: 'Memory threat',
        })}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        sectionDescription={MEMORY_THREAT_POLICY_SECTION_DESCRIPTION}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={MEMORY_PROTECTION_OS_VALUES}
            data-test-subj={getTestId('enableDisableSwitch')}
            onSectionActiveChange={onSectionActiveChange}
            onMasterSwitchTurnedOff={(_savedModes, policyBeforeToggle) =>
              setMasterOffDisplayModes({
                windows: policyBeforeToggle.windows[protection].mode,
                mac: policyBeforeToggle.mac[protection].mode,
                linux: policyBeforeToggle.linux[protection].mode,
              })
            }
          />
        }
      >
        {MEMORY_OS_LIST.map(({ os, operatingSystem }, index) => {
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
              isLast={index === MEMORY_OS_LIST.length - 1}
              data-test-subj={getTestId(`${os}Row`)}
            >
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
MemoryProtectionCard.displayName = 'MemoryProtectionCard';
