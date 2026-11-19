/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { useLicense as _useLicense } from '../../../../../common/hooks/use_license';
import { licenseService as licenseServiceMocked } from '../../../../../common/hooks/__mocks__/use_license';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../common/endpoint/types';
import { DeviceControlAccessLevel } from '../../../../../../common/endpoint/types';
import type { PolicyFormComponentCommonProps } from './types';
import { useGetDeviceControlUpsellComponent as _useGetDeviceControlUpsellComponent } from './hooks/use_get_device_control_component';
import { AntivirusRegistrationCard } from './antivirus_registration_card';
import { AttackSurfaceReductionCard } from './attack_surface_reduction_card';
import { BehaviourProtectionCard } from './behaviour_protection_card';
import { DeviceControlCard } from './device_control_card';
import { EventCollectionCard } from './event_collection_card';
import { MalwareProtectionsCard } from './malware_protections_card';
import { MemoryProtectionCard } from './memory_protection_card';
import { POLICY_SETTING_SECTION_DESCRIPTIONS } from './policy_setting_section_descriptions';
import { RansomwareProtectionCard } from './ransomware_protection_card';

jest.mock('../../../../../common/hooks/use_license');
jest.mock('./hooks/use_get_device_control_component');

jest.setTimeout(15_000); // Costly: each case drives several popover cycles

const useLicenseMock = _useLicense as jest.Mock;
const useGetDeviceControlUpsellComponentMock = _useGetDeviceControlUpsellComponent as jest.Mock;

const CARD_CASES: ReadonlyArray<{
  name: string;
  dataTestSubj: string;
  descriptionKey: keyof typeof POLICY_SETTING_SECTION_DESCRIPTIONS;
  renderCard: (props: PolicyFormComponentCommonProps) => React.ReactElement;
}> = [
  {
    name: 'Malware',
    dataTestSubj: 'test-malware',
    descriptionKey: 'malware',
    renderCard: (props) => <MalwareProtectionsCard {...props} />,
  },
  {
    name: 'Malicious behavior',
    dataTestSubj: 'test-maliciousBehavior',
    descriptionKey: 'maliciousBehavior',
    renderCard: (props) => <BehaviourProtectionCard {...props} />,
  },
  {
    name: 'Memory threat',
    dataTestSubj: 'test-memoryThreat',
    descriptionKey: 'memoryThreat',
    renderCard: (props) => <MemoryProtectionCard {...props} />,
  },
  {
    name: 'Ransomware',
    dataTestSubj: 'test-ransomware',
    descriptionKey: 'ransomware',
    renderCard: (props) => <RansomwareProtectionCard {...props} />,
  },
  {
    name: 'Antivirus solution',
    dataTestSubj: 'test-antivirusSolution',
    descriptionKey: 'antivirusSolution',
    renderCard: (props) => <AntivirusRegistrationCard {...props} />,
  },
  {
    name: 'Device control',
    dataTestSubj: 'test-deviceControl',
    descriptionKey: 'deviceControl',
    renderCard: (props) => <DeviceControlCard {...props} />,
  },
  {
    name: 'Attack surface reduction',
    dataTestSubj: 'test-attackSurfaceReduction',
    descriptionKey: 'attackSurfaceReduction',
    renderCard: (props) => <AttackSurfaceReductionCard {...props} />,
  },
  {
    name: 'Event collection',
    dataTestSubj: 'test-eventCollection',
    descriptionKey: 'eventCollection',
    renderCard: (props) => <EventCollectionCard {...props} />,
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

  it.each(CARD_CASES)(
    '$name card renders only its own description',
    ({ dataTestSubj, descriptionKey, renderCard }) => {
      const props: PolicyFormComponentCommonProps = {
        policy,
        onChange: jest.fn(),
        mode: 'edit',
        'data-test-subj': dataTestSubj,
      };
      const renderResult = mockedContext.render(renderCard(props));

      const description = renderResult.getByTestId(`${dataTestSubj}-description`);

      expect(description).toHaveTextContent(POLICY_SETTING_SECTION_DESCRIPTIONS[descriptionKey]);

      for (const [key, otherDescription] of Object.entries(POLICY_SETTING_SECTION_DESCRIPTIONS)) {
        if (key !== descriptionKey) {
          expect(description).not.toHaveTextContent(otherDescription);
        }
      }
    }
  );
});
