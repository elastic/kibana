/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../../mocks';
import type { AntivirusRegistrationCardProps } from './antivirus_registration_card';
import { AntivirusRegistrationCard } from './antivirus_registration_card';
import type { AppContextTestRender } from '../../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import { AntivirusRegistrationModes } from '../../../../../../../../common/endpoint/types';
import { ANTIVIRUS_POLICY_SECTION_DESCRIPTION } from '../policy_setting_section_descriptions';

describe('Policy Form Antivirus Registration Card', () => {
  const antivirusTestSubj = getPolicySettingsFormTestSubjects('test').antivirusRegistration;

  let formProps: AntivirusRegistrationCardProps;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': antivirusTestSubj.card,
    };

    render = () =>
      (renderResult = mockedContext.render(<AntivirusRegistrationCard {...formProps} />));
  });

  const getModeSelect = () =>
    renderResult.getByTestId(antivirusTestSubj.modeSelect) as HTMLSelectElement;

  it('should render in edit mode with default value selected', () => {
    render();

    expect(getModeSelect()).toBeInTheDocument();
    expect(getModeSelect().value).toBe(AntivirusRegistrationModes.sync);
    expect(getModeSelect().querySelectorAll('option')).toHaveLength(3);
  });

  it('should show `disabled` as selected if `antivirus_registration.mode` is disabled', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;

    render();

    expect(getModeSelect().value).toBe(AntivirusRegistrationModes.disabled);
  });

  it('should show `enabled` as selected if `antivirus_registration.mode` is enabled', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    render();

    expect(getModeSelect().value).toBe(AntivirusRegistrationModes.enabled);
  });

  it('should show `sync` as selected if `antivirus_registration.mode` is sync', () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;

    render();

    expect(getModeSelect().value).toBe(AntivirusRegistrationModes.sync);
  });

  it('should display for windows OS with restriction', () => {
    render();

    expect(renderResult.getByTestId(antivirusTestSubj.osValueContainer)).toHaveTextContent(
      ANTIVIRUS_POLICY_SECTION_DESCRIPTION
    );
    expect(renderResult.getByTestId(antivirusTestSubj.osValueContainer)).toHaveTextContent(
      'Restrictions'
    );
  });

  it('should be able to enable the option', async () => {
    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    render();

    await userEvent.selectOptions(getModeSelect(), AntivirusRegistrationModes.enabled);

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should be able to disable the option', async () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;

    render();

    await userEvent.selectOptions(getModeSelect(), AntivirusRegistrationModes.disabled);

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  it('should be able to set to sync with malware', async () => {
    formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;

    const expectedUpdate = cloneDeep(formProps.policy);
    expectedUpdate.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;

    render();

    await userEvent.selectOptions(getModeSelect(), AntivirusRegistrationModes.sync);

    expect(formProps.onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: expectedUpdate,
    });
  });

  describe('And rendered in View only mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render in view mode (option sync)', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(renderResult.getByTestId(antivirusTestSubj.modeSelect)).toHaveTextContent(
        'Sync with malware protection level'
      );
    });

    it('should render in view mode (option enabled)', () => {
      formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(renderResult.getByTestId(antivirusTestSubj.modeSelect)).toHaveTextContent('Enable');
    });

    it('should render in view mode (option disabled)', () => {
      formProps.policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
      render();

      expectIsViewOnly(renderResult.getByTestId(antivirusTestSubj.card));
      expect(renderResult.getByTestId(antivirusTestSubj.modeSelect)).toHaveTextContent('Disable');
    });
  });
});
