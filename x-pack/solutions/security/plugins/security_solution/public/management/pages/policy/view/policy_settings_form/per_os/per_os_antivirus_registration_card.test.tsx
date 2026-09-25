/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import {
  AntivirusRegistrationModes,
  ProtectionModes,
} from '../../../../../../../common/endpoint/types';
import { getPolicySettingsFormTestSubjects } from '../mocks';
import { OS_CONTROL_WIDTH } from './os_control_layout';
import type { PerOsAntivirusRegistrationCardProps } from './per_os_antivirus_registration_card';
import { PerOsAntivirusRegistrationCard } from './per_os_antivirus_registration_card';
import { selectOsControlOption } from './select_os_control_option.test.helpers';

jest.setTimeout(15_000); // Costly: each case drives several popover cycles
describe('PerOsAntivirusRegistrationCard', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').perOsAntivirusRegistration;
  let policy: PolicyConfig;
  let props: PerOsAntivirusRegistrationCardProps;
  let mockedContext: ReturnType<typeof createAppRootMockRenderer>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const render = () => {
    renderResult = mockedContext.render(
      <PerOsAntivirusRegistrationCard {...props} policy={policy} />
    );
    return renderResult;
  };

  const rerender = (nextPolicy: PolicyConfig) => {
    renderResult.rerender(<PerOsAntivirusRegistrationCard {...props} policy={nextPolicy} />);
  };

  const getUpdatedPolicy = (): PolicyConfig => {
    const onChange = props.onChange as jest.Mock;
    return onChange.mock.calls[onChange.mock.calls.length - 1][0].updatedPolicy;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    props = {
      policy,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.card,
    };
  });

  it('renders exactly one row labelled Windows and no Mac or Linux row', () => {
    render();

    expect(renderResult.getByTestId(testSubj.windows.row)).toHaveTextContent('Windows');
    expect(renderResult.queryByText('Mac')).not.toBeInTheDocument();
    expect(renderResult.queryByText('Linux')).not.toBeInTheDocument();
  });

  it.each([
    [AntivirusRegistrationModes.enabled, 'Enabled'],
    [AntivirusRegistrationModes.disabled, 'Disabled'],
    [AntivirusRegistrationModes.sync, 'Sync with malware protection level'],
  ])(
    'displays the selected antivirus registration mode for starting value %s',
    (registrationMode, label) => {
      policy.windows.antivirus_registration.mode = registrationMode;
      render();

      expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(label);
    }
  );

  it('keeps the mode select a constant width across the shortest and longest labels', () => {
    // "Sync with malware protection level" is far longer than "Disabled"; the control must not
    // resize with the selection, and the popover inherits this width so it must not wrap either.
    // Both ends of that range must keep the shared OS_CONTROL_WIDTH so a design tweak cannot
    // leave a stale literal behind here.
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
    render();

    const widthSubj = `${testSubj.card}-windows-mode-fixedWidth`;

    expect(renderResult.getByTestId(widthSubj)).toHaveStyleRule('inline-size', OS_CONTROL_WIDTH);

    // Unmount before re-rendering: the helper appends to the same container, so calling it
    // twice would leave two matching elements in the DOM.
    renderResult.unmount();
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;
    render();

    expect(renderResult.getByTestId(widthSubj)).toHaveStyleRule('inline-size', OS_CONTROL_WIDTH);
    expect(renderResult.getByTestId(widthSubj)).toHaveStyleRule('max-inline-size', '100%');
  });

  it('shows the Windows OS-restriction warning beside the OS label in every mode', () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
    render();

    expect(renderResult.getByTestId(`${testSubj.card}-windows-osRestriction`)).toBeInTheDocument();
    expect(renderResult.getByTestId(`${testSubj.card}-windows-osLabel`)).toContainElement(
      renderResult.getByTestId(`${testSubj.card}-windows-osRestriction`)
    );
  });

  it.each([AntivirusRegistrationModes.enabled, AntivirusRegistrationModes.disabled])(
    'hides the sync explanation when the mode is %s',
    (mode) => {
      policy.windows.antivirus_registration.mode = mode;
      render();

      expect(
        renderResult.queryByTestId(`${testSubj.card}-windows-syncExplanation`)
      ).not.toBeInTheDocument();
      // the OS restriction is unconditional, so it must still be there
      expect(
        renderResult.getByTestId(`${testSubj.card}-windows-osRestriction`)
      ).toBeInTheDocument();
    }
  );

  // Rendered text rather than tooltip content: an `EuiIconTip` keeps its message out of the DOM
  // until the user hovers, so finding it on a plain render is what proves it is inline now.
  it('shows the sync explanation inline when the sync mode is selected', () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;
    render();

    expect(renderResult.getByTestId(`${testSubj.card}-windows-syncExplanation`)).toHaveTextContent(
      'Use this setting to automatically enable antivirus registration if malware protection is set to Prevent. ' +
        'In any other case, antivirus registration will be disabled.'
    );
  });

  it('shows the Windows Defender notice for Enabled, hides it for Disabled, and follows the outcome for Sync', async () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;
    policy.windows.malware.mode = ProtectionModes.detect;
    render();

    const queryNotice = () => renderResult.queryByTestId(`${testSubj.card}-windows-defenderNotice`);
    const querySyncExplanation = () =>
      renderResult.queryByTestId(`${testSubj.card}-windows-syncExplanation`);

    expect(queryNotice()).toHaveTextContent('This will also disable Windows Defender.');
    expect(querySyncExplanation()).not.toBeInTheDocument();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, 'Disabled');
    rerender(getUpdatedPolicy());
    expect(queryNotice()).not.toBeInTheDocument();
    expect(querySyncExplanation()).not.toBeInTheDocument();

    await selectOsControlOption(
      renderResult,
      testSubj.windows.modeSelect,
      'Sync with malware protection level'
    );
    rerender(getUpdatedPolicy());
    expect(queryNotice()).not.toBeInTheDocument();
    expect(querySyncExplanation()).toBeInTheDocument();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, 'Enabled');
    rerender(getUpdatedPolicy());
    expect(queryNotice()).toHaveTextContent('This will also disable Windows Defender.');
    expect(querySyncExplanation()).not.toBeInTheDocument();
  });

  it('shows the Windows Defender notice in Sync mode only while the current level is enabled', () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;
    policy.windows.malware.mode = ProtectionModes.prevent;
    render();

    const expectSyncOutcome = (outcome: 'enabled' | 'disabled') => {
      expect(renderResult.getByText(`(Current level: ${outcome})`)).toBeInTheDocument();
      const notice = renderResult.queryByTestId(`${testSubj.card}-windows-defenderNotice`);
      if (outcome === 'enabled') {
        expect(notice).toHaveTextContent('This will also disable Windows Defender.');
      } else {
        expect(notice).not.toBeInTheDocument();
      }
      expect(
        renderResult.getByTestId(`${testSubj.card}-windows-syncExplanation`)
      ).toBeInTheDocument();
    };

    expectSyncOutcome('enabled');
    const nextPolicy = cloneDeep(policy);
    nextPolicy.windows.malware.mode = ProtectionModes.detect;
    rerender(nextPolicy);
    expectSyncOutcome('disabled');

    const disabledPolicy = cloneDeep(nextPolicy);
    disabledPolicy.windows.malware.mode = ProtectionModes.off;
    rerender(disabledPolicy);
    expectSyncOutcome('disabled');

    const restoredPolicy = cloneDeep(disabledPolicy);
    restoredPolicy.windows.malware.mode = ProtectionModes.prevent;
    rerender(restoredPolicy);
    expectSyncOutcome('enabled');
  });

  it('exposes all three AntivirusRegistrationModes values in the dropdown', async () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.windows.modeSelect));

    const optionLabels = (await renderResult.findAllByRole('option')).map(
      (option) => option.textContent
    );
    expect(optionLabels).toEqual(['Disabled', 'Sync with malware protection level', 'Enabled']);

    const disabledOption = await renderResult.findByRole('option', { name: /^Disabled$/ });
    expect(disabledOption.querySelector('[color="danger"]')).toBeInTheDocument();
  });

  it('selecting a mode updates windows.antivirus_registration.mode and leaves mac and linux byte-identical', async () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.sync;
    const macBefore = cloneDeep(policy.mac);
    const linuxBefore = cloneDeep(policy.linux);
    render();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, 'Enabled');

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.antivirus_registration.mode).toBe(
      AntivirusRegistrationModes.enabled
    );
    expect(updatedPolicy.mac).toEqual(macBefore);
    expect(updatedPolicy.linux).toEqual(linuxBefore);
  });

  it('does not write antivirus_registration.enabled; onChange leaves .enabled untouched', async () => {
    policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.disabled;
    policy.windows.antivirus_registration.enabled = false;
    const enabledBefore = policy.windows.antivirus_registration.enabled;
    render();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, 'Enabled');

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.windows.antivirus_registration.mode).toBe(
      AntivirusRegistrationModes.enabled
    );
    expect(updatedPolicy.windows.antivirus_registration.enabled).toBe(enabledBefore);
  });

  describe('And rendered in View only mode', () => {
    beforeEach(() => {
      props.mode = 'view';
    });

    it('should render in view mode with the selected mode displayed and the select disabled', () => {
      policy.windows.antivirus_registration.mode = AntivirusRegistrationModes.enabled;
      render();

      expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent('Enabled');
      expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toBeDisabled();
    });
  });
});
