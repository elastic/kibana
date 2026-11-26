/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { createTestSubjGenerator } from '../../../../mocks/utils';
import type {
  PolicyConfig,
  AntivirusRegistrationModes,
} from '../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../common/endpoint/types';

export const getPolicySettingsFormTestSubjects = (
  formTopLevelTestSubj: string = 'endpointPolicyForm'
) => {
  const genTestSubj = createTestSubjGenerator(formTopLevelTestSubj);
  const perOsMalwareTestSubj = genTestSubj.withPrefix('perOsMalware');
  const perOsAttackSurfaceTestSubj = genTestSubj.withPrefix('perOsAttackSurface');
  const perOsRansomwareTestSubj = genTestSubj.withPrefix('perOsRansomware');
  const perOsMemoryTestSubj = genTestSubj.withPrefix('perOsMemory');
  const perOsBehaviourTestSubj = genTestSubj.withPrefix('perOsBehaviour');
  const advancedSectionTestSubj = genTestSubj.withPrefix('advancedSection');
  const perOsEventCollectionTestSubj = genTestSubj.withPrefix('perOsEventCollection');
  const perOsAntivirusRegistrationTestSubj = genTestSubj.withPrefix('perOsAntivirusRegistration');
  const perOsDeviceControlTestSubj = genTestSubj.withPrefix('perOsDeviceControl');
  const perOsAiDataCollectionTestSubj = genTestSubj.withPrefix('perOsAiDataCollection');

  return {
    form: genTestSubj(),

    perOsMalware: {
      card: perOsMalwareTestSubj(),
      enableDisableSwitch: perOsMalwareTestSubj('enableDisableSwitch'),
      windows: {
        row: perOsMalwareTestSubj('windows'),
        modeSelect: perOsMalwareTestSubj('windows-mode'),
        blocklistSwitch: perOsMalwareTestSubj('windows-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: perOsMalwareTestSubj('windows-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: perOsMalwareTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: perOsMalwareTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: perOsMalwareTestSubj('mac'),
        modeSelect: perOsMalwareTestSubj('mac-mode'),
        blocklistSwitch: perOsMalwareTestSubj('mac-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: perOsMalwareTestSubj('mac-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: perOsMalwareTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: perOsMalwareTestSubj('mac-notifyUser-customMessage'),
      },
      linux: {
        row: perOsMalwareTestSubj('linux'),
        modeSelect: perOsMalwareTestSubj('linux-mode'),
        blocklistSwitch: perOsMalwareTestSubj('linux-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: perOsMalwareTestSubj('linux-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: perOsMalwareTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: perOsMalwareTestSubj('linux-notifyUser-customMessage'),
      },
    },
    perOsAttackSurface: {
      card: perOsAttackSurfaceTestSubj(),
      lockedCard: perOsAttackSurfaceTestSubj('locked'),
      lockedCardTitle: perOsAttackSurfaceTestSubj('locked-title'),
      windows: {
        row: perOsAttackSurfaceTestSubj('windows'),
        enableDisableSwitch: perOsAttackSurfaceTestSubj('windows-enableDisableSwitch'),
        switchLabel: perOsAttackSurfaceTestSubj('windows-switchLabel'),
        registryCredentialHardeningSwitch: perOsAttackSurfaceTestSubj(
          'windows-registryCredentialHardeningSwitch'
        ),
        registryCredentialHardeningSwitchLabel: perOsAttackSurfaceTestSubj(
          'windows-registryCredentialHardeningSwitchLabel'
        ),
        registryCredentialHardeningTooltipIcon: perOsAttackSurfaceTestSubj(
          'windows-registryCredentialHardeningTooltipIcon'
        ),
      },
    },
    perOsRansomware: {
      card: perOsRansomwareTestSubj(),
      lockedCard: perOsRansomwareTestSubj('locked'),
      lockedCardTitle: perOsRansomwareTestSubj('locked-title'),
      enableDisableSwitch: perOsRansomwareTestSubj('enableDisableSwitch'),
      windows: {
        row: perOsRansomwareTestSubj('windows'),
        modeSelect: perOsRansomwareTestSubj('windows-mode'),
        notifyUserCheckbox: perOsRansomwareTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: perOsRansomwareTestSubj('windows-notifyUser-customMessage'),
        notifyTooltipIcon: perOsRansomwareTestSubj('windows-notifyUser-tooltipIcon'),
        notifySupportedVersion: perOsRansomwareTestSubj('windows-notifyUser-supportedVersion'),
      },
      mac: {
        row: perOsRansomwareTestSubj('mac'),
        modeSelect: perOsRansomwareTestSubj('mac-mode'),
        notifyUserCheckbox: perOsRansomwareTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: perOsRansomwareTestSubj('mac-notifyUser-customMessage'),
        notifyTooltipIcon: perOsRansomwareTestSubj('mac-notifyUser-tooltipIcon'),
        notifySupportedVersion: perOsRansomwareTestSubj('mac-notifyUser-supportedVersion'),
      },
      linux: {
        row: perOsRansomwareTestSubj('linux'),
        modeSelect: perOsRansomwareTestSubj('linux-mode'),
        notifyUserCheckbox: perOsRansomwareTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: perOsRansomwareTestSubj('linux-notifyUser-customMessage'),
        notifyTooltipIcon: perOsRansomwareTestSubj('linux-notifyUser-tooltipIcon'),
        notifySupportedVersion: perOsRansomwareTestSubj('linux-notifyUser-supportedVersion'),
      },
    },
    perOsMemory: {
      card: perOsMemoryTestSubj(),
      lockedCard: perOsMemoryTestSubj('locked'),
      lockedCardTitle: perOsMemoryTestSubj('locked-title'),
      enableDisableSwitch: perOsMemoryTestSubj('enableDisableSwitch'),
      windows: {
        row: perOsMemoryTestSubj('windows'),
        modeSelect: perOsMemoryTestSubj('windows-mode'),
        notifyUserCheckbox: perOsMemoryTestSubj('windows-notifyUser-checkbox'),
        customYaraSignatures: perOsMemoryTestSubj('windows-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: perOsMemoryTestSubj(
          'windows-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: perOsMemoryTestSubj(
          'windows-customYaraSignatures-tooltipIcon'
        ),
      },
      mac: {
        row: perOsMemoryTestSubj('mac'),
        modeSelect: perOsMemoryTestSubj('mac-mode'),
        notifyUserCheckbox: perOsMemoryTestSubj('mac-notifyUser-checkbox'),
        customYaraSignatures: perOsMemoryTestSubj('mac-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: perOsMemoryTestSubj(
          'mac-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: perOsMemoryTestSubj(
          'mac-customYaraSignatures-tooltipIcon'
        ),
      },
      linux: {
        row: perOsMemoryTestSubj('linux'),
        modeSelect: perOsMemoryTestSubj('linux-mode'),
        notifyUserCheckbox: perOsMemoryTestSubj('linux-notifyUser-checkbox'),
        customYaraSignatures: perOsMemoryTestSubj('linux-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: perOsMemoryTestSubj(
          'linux-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: perOsMemoryTestSubj(
          'linux-customYaraSignatures-tooltipIcon'
        ),
      },
    },
    perOsBehaviour: {
      card: perOsBehaviourTestSubj(),
      lockedCard: perOsBehaviourTestSubj('locked'),
      lockedCardTitle: perOsBehaviourTestSubj('locked-title'),
      enableDisableSwitch: perOsBehaviourTestSubj('enableDisableSwitch'),
      windows: {
        row: perOsBehaviourTestSubj('windows'),
        modeSelect: perOsBehaviourTestSubj('windows-mode'),
        reputationServiceCheckbox: perOsBehaviourTestSubj('windows-reputationService-checkbox'),
        notifyUserCheckbox: perOsBehaviourTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: perOsBehaviourTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: perOsBehaviourTestSubj('mac'),
        modeSelect: perOsBehaviourTestSubj('mac-mode'),
        reputationServiceCheckbox: perOsBehaviourTestSubj('mac-reputationService-checkbox'),
        notifyUserCheckbox: perOsBehaviourTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: perOsBehaviourTestSubj('mac-notifyUser-customMessage'),
      },
      linux: {
        row: perOsBehaviourTestSubj('linux'),
        modeSelect: perOsBehaviourTestSubj('linux-mode'),
        reputationServiceCheckbox: perOsBehaviourTestSubj('linux-reputationService-checkbox'),
        notifyUserCheckbox: perOsBehaviourTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: perOsBehaviourTestSubj('linux-notifyUser-customMessage'),
      },
    },
    perOsEventCollection: {
      card: perOsEventCollectionTestSubj(),
      windows: {
        row: perOsEventCollectionTestSubj('windows'),
        optionsContainer: perOsEventCollectionTestSubj('windows-options'),
        credentialsCheckbox: perOsEventCollectionTestSubj('windows-credential_access'),
        dllCheckbox: perOsEventCollectionTestSubj('windows-dll_and_driver_load'),
        dnsCheckbox: perOsEventCollectionTestSubj('windows-dns'),
        fileCheckbox: perOsEventCollectionTestSubj('windows-file'),
        networkCheckbox: perOsEventCollectionTestSubj('windows-network'),
        processCheckbox: perOsEventCollectionTestSubj('windows-process'),
        registryCheckbox: perOsEventCollectionTestSubj('windows-registry'),
        securityCheckbox: perOsEventCollectionTestSubj('windows-security'),
      },
      mac: {
        row: perOsEventCollectionTestSubj('mac'),
        optionsContainer: perOsEventCollectionTestSubj('mac-options'),
        dnsCheckbox: perOsEventCollectionTestSubj('mac-dns'),
        fileCheckbox: perOsEventCollectionTestSubj('mac-file'),
        networkCheckbox: perOsEventCollectionTestSubj('mac-network'),
        processCheckbox: perOsEventCollectionTestSubj('mac-process'),
        securityCheckbox: perOsEventCollectionTestSubj('mac-security'),
      },
      linux: {
        row: perOsEventCollectionTestSubj('linux'),
        optionsContainer: perOsEventCollectionTestSubj('linux-options'),
        dnsCheckbox: perOsEventCollectionTestSubj('linux-dns'),
        fileCheckbox: perOsEventCollectionTestSubj('linux-file'),
        networkCheckbox: perOsEventCollectionTestSubj('linux-network'),
        processCheckbox: perOsEventCollectionTestSubj('linux-process'),
        sessionDataCheckbox: perOsEventCollectionTestSubj('linux-session_data'),
        captureTerminalCheckbox: perOsEventCollectionTestSubj('linux-tty_io'),
      },
    },
    perOsAntivirusRegistration: {
      card: perOsAntivirusRegistrationTestSubj(),
      windows: {
        row: perOsAntivirusRegistrationTestSubj('windows'),
        modeSelect: perOsAntivirusRegistrationTestSubj('windows-mode'),
      },
    },
    perOsDeviceControl: {
      card: perOsDeviceControlTestSubj(),
      lockedCard: perOsDeviceControlTestSubj('locked'),
      lockedCardTitle: perOsDeviceControlTestSubj('locked-title'),
      enableDisableSwitch: perOsDeviceControlTestSubj('enableDisableSwitch'),
      windows: {
        row: perOsDeviceControlTestSubj('windows'),
        accessLevelSelect: perOsDeviceControlTestSubj('windows-accessLevel'),
        notifyUser: perOsDeviceControlTestSubj('windows-notifyUser'),
        notifyUserCheckbox: perOsDeviceControlTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: perOsDeviceControlTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: perOsDeviceControlTestSubj('mac'),
        accessLevelSelect: perOsDeviceControlTestSubj('mac-accessLevel'),
        notifyUser: perOsDeviceControlTestSubj('mac-notifyUser'),
        notifyUserCheckbox: perOsDeviceControlTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: perOsDeviceControlTestSubj('mac-notifyUser-customMessage'),
      },
    },
    perOsAiDataCollection: {
      card: perOsAiDataCollectionTestSubj(),
      technicalPreviewBadge: perOsAiDataCollectionTestSubj('technicalPreviewBadge'),
      supportedVersion: perOsAiDataCollectionTestSubj('supportedVersion'),
      windows: {
        row: perOsAiDataCollectionTestSubj('windows'),
        enableDisableSwitch: perOsAiDataCollectionTestSubj('windows-enableDisableSwitch'),
        switchLabel: perOsAiDataCollectionTestSubj('windows-switchLabel'),
      },
      mac: {
        row: perOsAiDataCollectionTestSubj('mac'),
        enableDisableSwitch: perOsAiDataCollectionTestSubj('mac-enableDisableSwitch'),
        switchLabel: perOsAiDataCollectionTestSubj('mac-switchLabel'),
      },
      linux: {
        row: perOsAiDataCollectionTestSubj('linux'),
        enableDisableSwitch: perOsAiDataCollectionTestSubj('linux-enableDisableSwitch'),
        switchLabel: perOsAiDataCollectionTestSubj('linux-switchLabel'),
      },
    },
    advancedSection: {
      container: advancedSectionTestSubj(''),
      showHideButton: advancedSectionTestSubj('showButton'),
      settingsContainer: advancedSectionTestSubj('settings'),
      warningCallout: advancedSectionTestSubj('warning'),
      settingRowTestSubjects: (settingKeyPath: string) => {
        const testSubjForSetting = advancedSectionTestSubj.withPrefix(settingKeyPath);

        return {
          container: testSubjForSetting('container'),
          label: testSubjForSetting('label'),
          tooltipIcon: testSubjForSetting('tooltipIcon'),
          versionInfo: testSubjForSetting('versionInfo'),
          textField: settingKeyPath,
          viewValue: testSubjForSetting('viewValue'),
        };
      },
    },
  };
};

export const expectIsViewOnly = (elem: HTMLElement): void => {
  elem
    .querySelectorAll(
      // `input[type=hidden]` is excluded because EuiSuperSelect renders one per select to carry the
      // value for form submission. It is never user-editable and never receives `disabled`, so
      // asserting on it would say nothing about read-only rendering.
      'button:not(.euiLink, [data-test-subj*="advancedSection-showButton"], [data-test-subj="euiDismissCalloutButton"]),input:not([type="hidden"]),select,textarea'
    )
    .forEach((inputElement) => {
      expect(inputElement).toHaveAttribute('disabled');
    });
};

/**
 * Create a regular expression with the provided text that ensure it matches the entire string.
 * @param text
 */
export const exactMatchText = (text: string): RegExp => {
  // RegExp below taken from: https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
  return new RegExp(`^${text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
};

export const setMalwareModeToDetect = (policy: PolicyConfig) => {
  set(policy, 'windows.malware.mode', ProtectionModes.detect);
  set(policy, 'mac.malware.mode', ProtectionModes.detect);
  set(policy, 'linux.malware.mode', ProtectionModes.detect);

  set(policy, 'windows.popup.malware.enabled', false);
  set(policy, 'mac.popup.malware.enabled', false);
  set(policy, 'linux.popup.malware.enabled', false);
};

export const setAntivirusRegistration = (
  policy: PolicyConfig,
  mode: AntivirusRegistrationModes,
  enabled: boolean
) => {
  policy.windows.antivirus_registration.mode = mode;
  policy.windows.antivirus_registration.enabled = enabled;
};
