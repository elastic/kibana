/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel } from '../../../../../../../common/endpoint/types';
import type { PolicyFormComponentCommonProps } from '../types';
import { useGetDeviceControlUpsellComponent as _useGetDeviceControlUpsellComponent } from '../hooks/use_get_device_control_component';
import { PerOsAntivirusRegistrationCard } from './per_os_antivirus_registration_card';
import { PerOsAttackSurfaceReductionCard } from './per_os_attack_surface_reduction_card';
import { PerOsBehaviourProtectionCard } from './per_os_behaviour_protection_card';
import { PerOsDeviceControlCard } from './per_os_device_control_card';
import { PerOsEventCollectionCard } from './per_os_event_collection_card';
import { PerOsMalwareProtectionsCard } from './per_os_malware_protections_card';
import { PerOsMemoryProtectionCard } from './per_os_memory_protection_card';
import { POLICY_SETTING_SECTION_DESCRIPTIONS } from './policy_setting_section_descriptions';
import { PerOsRansomwareProtectionCard } from './per_os_ransomware_protection_card';

jest.mock('../../../../../../common/hooks/use_license');
jest.mock('../hooks/use_get_device_control_component');

const useLicenseMock = _useLicense as jest.Mock;
const useGetDeviceControlUpsellComponentMock = _useGetDeviceControlUpsellComponent as jest.Mock;

const CARD_CASES: ReadonlyArray<{
  name: string;
  dataTestSubj: string;
  description: string;
  renderCard: (props: PolicyFormComponentCommonProps) => React.ReactElement;
}> = [
  {
    name: 'Malware',
    dataTestSubj: 'test-malware',
    description:
      'Configure how Elastic Defend protects your endpoints. Changes apply to all hosts assigned to this policy.',
    renderCard: (props) => <PerOsMalwareProtectionsCard {...props} />,
  },
  {
    name: 'Malicious behavior',
    dataTestSubj: 'test-maliciousBehavior',
    description:
      'Control how Elastic Defend responds to malicious behavior on your endpoints. Choose between detection only or full prevention, and configure user notification behavior.',
    renderCard: (props) => <PerOsBehaviourProtectionCard {...props} />,
  },
  {
    name: 'Memory threat',
    dataTestSubj: 'test-memoryThreat',
    description:
      'Prevent in-memory attacks such as shellcode injection, reflective DLL loading, and malicious Office macros.',
    renderCard: (props) => <PerOsMemoryProtectionCard {...props} />,
  },
  {
    name: 'Ransomware',
    dataTestSubj: 'test-ransomware',
    description:
      'Detect ransomware by monitoring canary files and taking response actions when encryption activity is identified.',
    renderCard: (props) => <PerOsRansomwareProtectionCard {...props} />,
  },
  {
    name: 'Antivirus solution',
    dataTestSubj: 'test-antivirusSolution',
    description:
      'Register Elastic as an official Antivirus solution for Windows OS. This will also disable Windows Defender.',
    renderCard: (props) => <PerOsAntivirusRegistrationCard {...props} />,
  },
  {
    name: 'Device control',
    dataTestSubj: 'test-deviceControl',
    description:
      'Control which external devices — such as USB drives and removable media — can interact with your endpoints. Set read, write, and execute permissions per OS.',
    renderCard: (props) => <PerOsDeviceControlCard {...props} />,
  },
  {
    name: 'Attack surface reduction',
    dataTestSubj: 'test-attackSurfaceReduction',
    description: 'Limit the ways attackers can compromise your endpoints.',
    renderCard: (props) => <PerOsAttackSurfaceReductionCard {...props} />,
  },
  {
    name: 'Event collection',
    dataTestSubj: 'test-eventCollection',
    description:
      'Select which system events to collect for monitoring and analysis. Selecting more event types increases visibility but may impact performance — enable only what you use and require.',
    renderCard: (props) => <PerOsEventCollectionCard {...props} />,
  },
];

describe('per-OS policy setting section descriptions', () => {
  let mockedContext: AppContextTestRender;
  let policy: PolicyConfig;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedContext.setExperimentalFlag({ linuxDnsEvents: true });
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    policy.windows.device_control = {
      enabled: true,
      usb_storage: DeviceControlAccessLevel.audit,
    };
    policy.mac.device_control = {
      enabled: true,
      usb_storage: DeviceControlAccessLevel.audit,
    };
    useLicenseMock.mockReturnValue(licenseServiceMocked);
    useGetDeviceControlUpsellComponentMock.mockReturnValue(null);
  });

  it('exports a frozen description record', () => {
    expect(Object.isFrozen(POLICY_SETTING_SECTION_DESCRIPTIONS)).toBe(true);
  });

  it.each(CARD_CASES)(
    '$name card renders its description',
    ({ dataTestSubj, description, renderCard }) => {
      const props: PolicyFormComponentCommonProps = {
        policy,
        onChange: jest.fn(),
        mode: 'edit',
        'data-test-subj': dataTestSubj,
      };
      const renderResult = mockedContext.render(renderCard(props));

      expect(renderResult.getByTestId(`${dataTestSubj}-description`)).toHaveTextContent(
        description
      );
    }
  );
});
