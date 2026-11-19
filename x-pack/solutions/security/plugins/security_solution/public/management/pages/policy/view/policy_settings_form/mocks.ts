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
  const malwareTestSubj = genTestSubj.withPrefix('malware');
  const attackSurfaceTestSubj = genTestSubj.withPrefix('attackSurface');
  const ransomwareTestSubj = genTestSubj.withPrefix('ransomware');
  const memoryTestSubj = genTestSubj.withPrefix('memory');
  const behaviourTestSubj = genTestSubj.withPrefix('behaviour');
  const advancedSectionTestSubj = genTestSubj.withPrefix('advancedSection');
  const eventCollectionTestSubj = genTestSubj.withPrefix('eventCollection');
  const antivirusRegistrationTestSubj = genTestSubj.withPrefix('antivirusRegistration');
  const deviceControlTestSubj = genTestSubj.withPrefix('deviceControl');
  const aiDataCollectionTestSubj = genTestSubj.withPrefix('aiDataCollection');

  return {
    form: genTestSubj(),

    malware: {
      card: malwareTestSubj(),
      enableDisableSwitch: malwareTestSubj('enableDisableSwitch'),
      windows: {
        row: malwareTestSubj('windows'),
        modeSelect: malwareTestSubj('windows-mode'),
        blocklistSwitch: malwareTestSubj('windows-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: malwareTestSubj('windows-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: malwareTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: malwareTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: malwareTestSubj('mac'),
        modeSelect: malwareTestSubj('mac-mode'),
        blocklistSwitch: malwareTestSubj('mac-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: malwareTestSubj('mac-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: malwareTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: malwareTestSubj('mac-notifyUser-customMessage'),
      },
      linux: {
        row: malwareTestSubj('linux'),
        modeSelect: malwareTestSubj('linux-mode'),
        blocklistSwitch: malwareTestSubj('linux-blocklist-enableDisableSwitch'),
        onWriteScanSwitch: malwareTestSubj('linux-onWriteScan-enableDisableSwitch'),
        notifyUserCheckbox: malwareTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: malwareTestSubj('linux-notifyUser-customMessage'),
      },
    },
    attackSurface: {
      card: attackSurfaceTestSubj(),
      lockedCard: attackSurfaceTestSubj('locked'),
      lockedCardTitle: attackSurfaceTestSubj('locked-title'),
      windows: {
        row: attackSurfaceTestSubj('windows'),
        enableDisableSwitch: attackSurfaceTestSubj('windows-enableDisableSwitch'),
        switchLabel: attackSurfaceTestSubj('windows-switchLabel'),
        registryCredentialHardeningSwitch: attackSurfaceTestSubj(
          'windows-registryCredentialHardeningSwitch'
        ),
        registryCredentialHardeningSwitchLabel: attackSurfaceTestSubj(
          'windows-registryCredentialHardeningSwitchLabel'
        ),
        registryCredentialHardeningTooltipIcon: attackSurfaceTestSubj(
          'windows-registryCredentialHardeningTooltipIcon'
        ),
      },
    },
    ransomware: {
      card: ransomwareTestSubj(),
      lockedCard: ransomwareTestSubj('locked'),
      lockedCardTitle: ransomwareTestSubj('locked-title'),
      enableDisableSwitch: ransomwareTestSubj('enableDisableSwitch'),
      windows: {
        row: ransomwareTestSubj('windows'),
        modeSelect: ransomwareTestSubj('windows-mode'),
        notifyUserCheckbox: ransomwareTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: ransomwareTestSubj('windows-notifyUser-customMessage'),
        notifyTooltipIcon: ransomwareTestSubj('windows-notifyUser-tooltipIcon'),
        notifySupportedVersion: ransomwareTestSubj('windows-notifyUser-supportedVersion'),
      },
      mac: {
        row: ransomwareTestSubj('mac'),
        modeSelect: ransomwareTestSubj('mac-mode'),
        notifyUserCheckbox: ransomwareTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: ransomwareTestSubj('mac-notifyUser-customMessage'),
        notifyTooltipIcon: ransomwareTestSubj('mac-notifyUser-tooltipIcon'),
        notifySupportedVersion: ransomwareTestSubj('mac-notifyUser-supportedVersion'),
      },
      linux: {
        row: ransomwareTestSubj('linux'),
        modeSelect: ransomwareTestSubj('linux-mode'),
        notifyUserCheckbox: ransomwareTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: ransomwareTestSubj('linux-notifyUser-customMessage'),
        notifyTooltipIcon: ransomwareTestSubj('linux-notifyUser-tooltipIcon'),
        notifySupportedVersion: ransomwareTestSubj('linux-notifyUser-supportedVersion'),
      },
    },
    memory: {
      card: memoryTestSubj(),
      lockedCard: memoryTestSubj('locked'),
      lockedCardTitle: memoryTestSubj('locked-title'),
      enableDisableSwitch: memoryTestSubj('enableDisableSwitch'),
      windows: {
        row: memoryTestSubj('windows'),
        modeSelect: memoryTestSubj('windows-mode'),
        notifyUserCheckbox: memoryTestSubj('windows-notifyUser-checkbox'),
        customYaraSignatures: memoryTestSubj('windows-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: memoryTestSubj(
          'windows-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: memoryTestSubj('windows-customYaraSignatures-tooltipIcon'),
      },
      mac: {
        row: memoryTestSubj('mac'),
        modeSelect: memoryTestSubj('mac-mode'),
        notifyUserCheckbox: memoryTestSubj('mac-notifyUser-checkbox'),
        customYaraSignatures: memoryTestSubj('mac-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: memoryTestSubj(
          'mac-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: memoryTestSubj('mac-customYaraSignatures-tooltipIcon'),
      },
      linux: {
        row: memoryTestSubj('linux'),
        modeSelect: memoryTestSubj('linux-mode'),
        notifyUserCheckbox: memoryTestSubj('linux-notifyUser-checkbox'),
        customYaraSignatures: memoryTestSubj('linux-customYaraSignatures'),
        customYaraSignaturesEnableDisableSwitch: memoryTestSubj(
          'linux-customYaraSignatures-enableDisableSwitch'
        ),
        customYaraSignaturesTooltipIcon: memoryTestSubj('linux-customYaraSignatures-tooltipIcon'),
      },
    },
    behaviour: {
      card: behaviourTestSubj(),
      lockedCard: behaviourTestSubj('locked'),
      lockedCardTitle: behaviourTestSubj('locked-title'),
      enableDisableSwitch: behaviourTestSubj('enableDisableSwitch'),
      windows: {
        row: behaviourTestSubj('windows'),
        modeSelect: behaviourTestSubj('windows-mode'),
        reputationServiceCheckbox: behaviourTestSubj('windows-reputationService-checkbox'),
        notifyUserCheckbox: behaviourTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: behaviourTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: behaviourTestSubj('mac'),
        modeSelect: behaviourTestSubj('mac-mode'),
        reputationServiceCheckbox: behaviourTestSubj('mac-reputationService-checkbox'),
        notifyUserCheckbox: behaviourTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: behaviourTestSubj('mac-notifyUser-customMessage'),
      },
      linux: {
        row: behaviourTestSubj('linux'),
        modeSelect: behaviourTestSubj('linux-mode'),
        reputationServiceCheckbox: behaviourTestSubj('linux-reputationService-checkbox'),
        notifyUserCheckbox: behaviourTestSubj('linux-notifyUser-checkbox'),
        notifyCustomMessage: behaviourTestSubj('linux-notifyUser-customMessage'),
      },
    },
    eventCollection: {
      card: eventCollectionTestSubj(),
      windows: {
        row: eventCollectionTestSubj('windows'),
        optionsContainer: eventCollectionTestSubj('windows-options'),
        credentialsCheckbox: eventCollectionTestSubj('windows-credential_access'),
        dllCheckbox: eventCollectionTestSubj('windows-dll_and_driver_load'),
        dnsCheckbox: eventCollectionTestSubj('windows-dns'),
        fileCheckbox: eventCollectionTestSubj('windows-file'),
        networkCheckbox: eventCollectionTestSubj('windows-network'),
        processCheckbox: eventCollectionTestSubj('windows-process'),
        registryCheckbox: eventCollectionTestSubj('windows-registry'),
        securityCheckbox: eventCollectionTestSubj('windows-security'),
      },
      mac: {
        row: eventCollectionTestSubj('mac'),
        optionsContainer: eventCollectionTestSubj('mac-options'),
        dnsCheckbox: eventCollectionTestSubj('mac-dns'),
        fileCheckbox: eventCollectionTestSubj('mac-file'),
        networkCheckbox: eventCollectionTestSubj('mac-network'),
        processCheckbox: eventCollectionTestSubj('mac-process'),
        securityCheckbox: eventCollectionTestSubj('mac-security'),
      },
      linux: {
        row: eventCollectionTestSubj('linux'),
        optionsContainer: eventCollectionTestSubj('linux-options'),
        dnsCheckbox: eventCollectionTestSubj('linux-dns'),
        fileCheckbox: eventCollectionTestSubj('linux-file'),
        networkCheckbox: eventCollectionTestSubj('linux-network'),
        processCheckbox: eventCollectionTestSubj('linux-process'),
        sessionDataCheckbox: eventCollectionTestSubj('linux-session_data'),
        captureTerminalCheckbox: eventCollectionTestSubj('linux-tty_io'),
      },
    },
    antivirusRegistration: {
      card: antivirusRegistrationTestSubj(),
      windows: {
        row: antivirusRegistrationTestSubj('windows'),
        modeSelect: antivirusRegistrationTestSubj('windows-mode'),
      },
    },
    deviceControl: {
      card: deviceControlTestSubj(),
      lockedCard: deviceControlTestSubj('locked'),
      lockedCardTitle: deviceControlTestSubj('locked-title'),
      enableDisableSwitch: deviceControlTestSubj('enableDisableSwitch'),
      windows: {
        row: deviceControlTestSubj('windows'),
        accessLevelSelect: deviceControlTestSubj('windows-accessLevel'),
        notifyUser: deviceControlTestSubj('windows-notifyUser'),
        notifyUserCheckbox: deviceControlTestSubj('windows-notifyUser-checkbox'),
        notifyCustomMessage: deviceControlTestSubj('windows-notifyUser-customMessage'),
      },
      mac: {
        row: deviceControlTestSubj('mac'),
        accessLevelSelect: deviceControlTestSubj('mac-accessLevel'),
        notifyUser: deviceControlTestSubj('mac-notifyUser'),
        notifyUserCheckbox: deviceControlTestSubj('mac-notifyUser-checkbox'),
        notifyCustomMessage: deviceControlTestSubj('mac-notifyUser-customMessage'),
      },
    },
    aiDataCollection: {
      card: aiDataCollectionTestSubj(),
      technicalPreviewBadge: aiDataCollectionTestSubj('technicalPreviewBadge'),
      supportedVersion: aiDataCollectionTestSubj('supportedVersion'),
      windows: {
        row: aiDataCollectionTestSubj('windows'),
        enableDisableSwitch: aiDataCollectionTestSubj('windows-enableDisableSwitch'),
        switchLabel: aiDataCollectionTestSubj('windows-switchLabel'),
      },
      mac: {
        row: aiDataCollectionTestSubj('mac'),
        enableDisableSwitch: aiDataCollectionTestSubj('mac-enableDisableSwitch'),
        switchLabel: aiDataCollectionTestSubj('mac-switchLabel'),
      },
      linux: {
        row: aiDataCollectionTestSubj('linux'),
        enableDisableSwitch: aiDataCollectionTestSubj('linux-enableDisableSwitch'),
        switchLabel: aiDataCollectionTestSubj('linux-switchLabel'),
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
