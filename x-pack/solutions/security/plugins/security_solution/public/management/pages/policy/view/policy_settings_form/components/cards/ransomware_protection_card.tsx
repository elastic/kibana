/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { NotifyUserOption } from '../notify_user_option';
import { OsProtectionRow } from '../os_protection_row';
import { OsProtectionModeSelect } from '../os_protection_mode_select';
import { SettingCard } from '../setting_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../common/endpoint/types';
import type { RansomwareProtectionOSes } from '../../../../types';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import { RANSOMWARE_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';
import { useProtectionMasterOffDisplaySnapshot } from '../../hooks/use_protection_master_off_display_snapshot';
import { useProtectionSectionSelected } from '../../hooks/use_protection_section_selected';

const RANSOMWARE_OS_VALUES: Immutable<RansomwareProtectionOSes[]> = [PolicyOperatingSystem.windows];

export const LOCKED_CARD_RAMSOMWARE_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.ransomware',
  { defaultMessage: 'Ransomware' }
);

export type RansomwareProtectionCardProps = PolicyFormComponentCommonProps;

export const RansomwareProtectionCard = React.memo<RansomwareProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const protection = 'ransomware';

    const { sectionSelected: selected, onSectionActiveChange } = useProtectionSectionSelected(
      policy,
      protection,
      RANSOMWARE_OS_VALUES
    );

    const { masterOffDisplayModes, setMasterOffDisplayModes } =
      useProtectionMasterOffDisplaySnapshot(selected);

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.ransomware',
      { defaultMessage: 'Ransomware protections' }
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_RAMSOMWARE_TITLE}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    const ransomwareDisplayModeForDetailedUi = selected
      ? policy.windows[protection].mode
      : masterOffDisplayModes?.windows ?? policy.windows[protection].mode;
    const showRansomwareDetailedSettings =
      ransomwareDisplayModeForDetailedUi === ProtectionModes.detect ||
      ransomwareDisplayModeForDetailedUi === ProtectionModes.prevent;

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
          defaultMessage: 'Ransomware',
        })}
        supportedOss={[OperatingSystem.WINDOWS]}
        sectionDescription={RANSOMWARE_POLICY_SECTION_DESCRIPTION}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={RANSOMWARE_OS_VALUES}
            onChange={onChange}
            policy={policy}
            mode={mode}
            data-test-subj={getTestId('enableDisableSwitch')}
            onSectionActiveChange={onSectionActiveChange}
            onMasterSwitchTurnedOff={(_savedModes, policyBeforeToggle) =>
              setMasterOffDisplayModes({
                windows: policyBeforeToggle.windows[protection].mode,
              })
            }
          />
        }
      >
        <OsProtectionRow
          isLast
          os={OperatingSystem.WINDOWS}
          data-test-subj={getTestId('windowsRow')}
        >
          <OsProtectionModeSelect
            os="windows"
            protection={protection}
            policy={policy}
            onChange={onChange}
            mode={mode}
            displayModeWhenPolicyOff={masterOffDisplayModes?.windows}
            sectionFeatureEnabled={selected}
            data-test-subj={getTestId('windowsModeSelect')}
          />
          {showRansomwareDetailedSettings && (
            <NotifyUserOption
              policy={policy}
              onChange={onChange}
              mode={mode}
              protection={protection}
              os="windows"
              sectionFeatureEnabled={selected}
              data-test-subj={getTestId('windowsNotifyUser')}
            />
          )}
        </OsProtectionRow>
      </SettingCard>
    );
  }
);
RansomwareProtectionCard.displayName = 'RansomwareProtectionCard';
