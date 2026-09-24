/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { OS_TITLES } from '../../../../../common/translations';
import { exactMatchText, expectIsViewOnly, getPolicySettingsFormTestSubjects } from '../mocks';
import { CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL } from '../components/shared_translations';
import type { PerOsMemoryProtectionCardProps } from './per_os_memory_protection_card';
import {
  LOCKED_CARD_MEMORY_TITLE,
  PerOsMemoryProtectionCard,
} from './per_os_memory_protection_card';
import { selectOsControlOption } from './select_os_control_option.test.helpers';

jest.mock('../../../../../../common/hooks/use_license');

jest.setTimeout(15_000); // Costly: each case drives several popover cycles

const useLicenseMock = _useLicense as jest.Mock;

describe('PerOsMemoryProtectionCard', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').perOsMemory;
  let policy: PolicyConfig;
  let props: PerOsMemoryProtectionCardProps;
  let mockedContext: ReturnType<typeof createAppRootMockRenderer>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const render = () => {
    renderResult = mockedContext.render(<PerOsMemoryProtectionCard {...props} policy={policy} />);
    return renderResult;
  };
  const rerender = (nextPolicy: PolicyConfig) => {
    renderResult.rerender(<PerOsMemoryProtectionCard {...props} policy={nextPolicy} />);
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

  it('renders a row for each of Windows, Mac, Linux with the correct OS_TITLES label', () => {
    render();

    expect(renderResult.getByTestId(testSubj.windows.row)).toHaveTextContent(
      OS_TITLES[OperatingSystem.WINDOWS]
    );
    expect(renderResult.getByTestId(testSubj.mac.row)).toHaveTextContent(
      OS_TITLES[OperatingSystem.MAC]
    );
    expect(renderResult.getByTestId(testSubj.linux.row)).toHaveTextContent(
      OS_TITLES[OperatingSystem.LINUX]
    );
  });

  it("shows each row's memory_protection.mode from that OS branch", () => {
    policy.windows.memory_protection.mode = ProtectionModes.off;
    policy.mac.memory_protection.mode = ProtectionModes.detect;
    policy.linux.memory_protection.mode = ProtectionModes.prevent;
    render();

    expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Disable$/);
    expect(renderResult.getByTestId(testSubj.mac.modeSelect)).toHaveTextContent(/^Detect$/);
    expect(renderResult.getByTestId(testSubj.linux.modeSelect)).toHaveTextContent(
      /^Detect & prevent$/
    );
  });

  it('a row at Disable renders its mode dropdown and no notify panel', () => {
    policy.windows.memory_protection.mode = ProtectionModes.off;
    policy.mac.memory_protection.mode = ProtectionModes.detect;
    render();

    const windowsRow = within(renderResult.getByTestId(testSubj.windows.row));
    expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Disable$/);
    expect(windowsRow.queryByText('Notify user')).not.toBeInTheDocument();
  });

  it('with Windows at Disable and macOS at Detect, macOS still shows all its controls', () => {
    policy.windows.memory_protection.mode = ProtectionModes.off;
    policy.mac.memory_protection.mode = ProtectionModes.detect;
    policy.mac.popup.memory_protection.enabled = true;
    render();

    expect(renderResult.getByTestId(testSubj.mac.notifyUserCheckbox)).toBeEnabled();
    expect(
      within(renderResult.getByTestId(testSubj.mac.row)).getByText('Notify user')
    ).toBeInTheDocument();
  });

  it('Disable leaves stored notify values; Detect sets popup.enabled false and Prevent sets it true', async () => {
    policy.windows.memory_protection.mode = ProtectionModes.detect;
    policy.windows.popup.memory_protection.enabled = true;
    policy.windows.popup.memory_protection.message = 'keep me';
    const windowsBefore = cloneDeep(policy.windows);
    render();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Disable$/);
    const afterDisable = getUpdatedPolicy();
    expect(afterDisable.windows.memory_protection.mode).toBe(ProtectionModes.off);
    expect(afterDisable.windows.popup.memory_protection.enabled).toBe(true);
    expect(afterDisable.windows.popup.memory_protection.message).toBe('keep me');
    expect({
      ...afterDisable.windows,
      memory_protection: {
        ...afterDisable.windows.memory_protection,
        mode: windowsBefore.memory_protection.mode,
      },
    }).toEqual(windowsBefore);

    rerender(afterDisable);
    expect(renderResult.queryByTestId(testSubj.windows.notifyUserCheckbox)).not.toBeInTheDocument();

    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect$/);
    const afterDetect = getUpdatedPolicy();
    expect(afterDetect.windows.memory_protection.mode).toBe(ProtectionModes.detect);
    expect(afterDetect.windows.popup.memory_protection.enabled).toBe(false);
    expect(afterDetect.windows.popup.memory_protection.message).toBe('keep me');

    rerender(afterDetect);
    await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect & prevent$/);
    const afterPrevent = getUpdatedPolicy();
    expect(afterPrevent.windows.memory_protection.mode).toBe(ProtectionModes.prevent);
    expect(afterPrevent.windows.popup.memory_protection.enabled).toBe(true);
    expect(afterPrevent.windows.popup.memory_protection.message).toBe('keep me');
  });

  it('changing the macOS mode leaves windows and linux byte-identical on updatedPolicy', async () => {
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    policy.mac.memory_protection.mode = ProtectionModes.prevent;
    render();

    await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Detect$/);
    const afterMode = getUpdatedPolicy();
    expect(afterMode.mac.memory_protection.mode).toBe(ProtectionModes.detect);
    expect(afterMode.windows).toEqual(windowsBefore);
    expect(afterMode.linux).toEqual(linuxBefore);
  });

  it('changing the macOS notify checkbox leaves windows and linux byte-identical on updatedPolicy', async () => {
    const windowsBefore = cloneDeep(policy.windows);
    const linuxBefore = cloneDeep(policy.linux);
    policy.mac.memory_protection.mode = ProtectionModes.prevent;
    policy.mac.popup.memory_protection.enabled = true;
    render();

    await userEvent.click(renderResult.getByTestId(testSubj.mac.notifyUserCheckbox));
    const afterNotify = getUpdatedPolicy();
    expect(afterNotify.mac.popup.memory_protection.enabled).toBe(false);
    expect(afterNotify.windows).toEqual(windowsBefore);
    expect(afterNotify.linux).toEqual(linuxBefore);
  });

  it('master toggle reads on when Windows is off but macOS is prevent', () => {
    policy.windows.memory_protection.mode = ProtectionModes.off;
    policy.mac.memory_protection.mode = ProtectionModes.prevent;
    policy.linux.memory_protection.mode = ProtectionModes.off;
    render();

    expect(
      renderResult.getByTestId(testSubj.enableDisableSwitch).getAttribute('aria-checked')
    ).toBe('true');
  });

  describe('and license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should show locked card if license not platinum+', () => {
      render();

      expect(renderResult.getByTestId(testSubj.lockedCardTitle)).toHaveTextContent(
        exactMatchText(LOCKED_CARD_MEMORY_TITLE)
      );
    });
  });

  describe('and displayed in View Mode', () => {
    beforeEach(() => {
      props.mode = 'view';
    });

    it('should render in view mode', () => {
      render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.card));
    });

    it('should show the stored protection mode', () => {
      policy.windows.memory_protection.mode = ProtectionModes.detect;
      render();

      expect(renderResult.getByTestId(testSubj.windows.modeSelect)).toHaveTextContent(/^Detect$/);
    });

    it('collapses the card body when memory protection is off on every OS', () => {
      policy.windows.memory_protection.mode = ProtectionModes.off;
      policy.mac.memory_protection.mode = ProtectionModes.off;
      policy.linux.memory_protection.mode = ProtectionModes.off;
      render();

      expect(renderResult.queryByTestId(testSubj.windows.row)).not.toBeInTheDocument();
      expect(renderResult.queryByTestId(testSubj.mac.row)).not.toBeInTheDocument();
      expect(renderResult.queryByTestId(testSubj.linux.row)).not.toBeInTheDocument();
    });

    it('renders OS rows when at least one OS is not off', () => {
      policy.windows.memory_protection.mode = ProtectionModes.off;
      policy.mac.memory_protection.mode = ProtectionModes.detect;
      policy.linux.memory_protection.mode = ProtectionModes.off;
      render();

      expect(renderResult.getByTestId(testSubj.windows.row)).toBeInTheDocument();
      expect(renderResult.getByTestId(testSubj.mac.row)).toBeInTheDocument();
      expect(renderResult.getByTestId(testSubj.linux.row)).toBeInTheDocument();
    });
  });

  describe('custom YARA signatures', () => {
    const OS_LIST = ['windows', 'mac', 'linux'] as const;

    const getCustomYaraSignaturesSwitch = (os: (typeof OS_LIST)[number]) =>
      renderResult.getByTestId(testSubj[os].customYaraSignaturesEnableDisableSwitch);

    const setMemoryProtectionModeOnAllOses = (nextMode: ProtectionModes) => {
      for (const os of OS_LIST) {
        policy[os].memory_protection.mode = nextMode;
      }
    };

    describe('and the experimental flag is disabled', () => {
      it('does not render a custom YARA signatures switch in any row', () => {
        render();

        for (const os of OS_LIST) {
          expect(renderResult.queryByTestId(testSubj[os].customYaraSignatures)).toBeNull();
        }
      });

      it('leaves custom_yara_signatures untouched when the master toggle turns memory protection off', async () => {
        delete policy.linux.memory_protection.custom_yara_signatures;
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        const updatedPolicy = getUpdatedPolicy();
        expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.linux.memory_protection).not.toHaveProperty('custom_yara_signatures');
      });

      it('leaves custom_yara_signatures untouched when a row changes from Disable to Detect', async () => {
        policy.windows.memory_protection.mode = ProtectionModes.off;
        policy.windows.memory_protection.custom_yara_signatures = false;
        policy.mac.memory_protection.mode = ProtectionModes.off;
        delete policy.mac.memory_protection.custom_yara_signatures;
        render();

        await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect$/);
        expect(getUpdatedPolicy().windows.memory_protection.custom_yara_signatures).toBe(false);

        await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Detect$/);
        expect(getUpdatedPolicy().mac.memory_protection).not.toHaveProperty(
          'custom_yara_signatures'
        );
      });
    });

    describe('and the experimental flag is enabled', () => {
      beforeEach(() => {
        mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: true });
      });

      it("renders each row's switch from that OS's own value", () => {
        policy.windows.memory_protection.custom_yara_signatures = true;
        policy.mac.memory_protection.custom_yara_signatures = false;
        delete policy.linux.memory_protection.custom_yara_signatures;
        render();

        expect(getCustomYaraSignaturesSwitch('windows')).toHaveAttribute('aria-checked', 'true');
        expect(getCustomYaraSignaturesSwitch('mac')).toHaveAttribute('aria-checked', 'false');
        expect(getCustomYaraSignaturesSwitch('linux')).toHaveAttribute('aria-checked', 'false');
        for (const os of OS_LIST) {
          expect(getCustomYaraSignaturesSwitch(os)).toBeEnabled();
        }
        expect(renderResult.getByTestId(testSubj.windows.customYaraSignatures)).toHaveTextContent(
          'Apply custom YARA signatures'
        );
      });

      it('does not render the switch on a row set to Disable', () => {
        policy.windows.memory_protection.mode = ProtectionModes.off;
        render();

        expect(renderResult.queryByTestId(testSubj.windows.customYaraSignatures)).toBeNull();
        expect(renderResult.getByTestId(testSubj.mac.customYaraSignatures)).toBeInTheDocument();
        expect(renderResult.getByTestId(testSubj.linux.customYaraSignatures)).toBeInTheDocument();
      });

      it('toggling the macOS switch leaves windows and linux byte-identical on updatedPolicy', async () => {
        const windowsBefore = cloneDeep(policy.windows);
        const linuxBefore = cloneDeep(policy.linux);
        render();

        await userEvent.click(getCustomYaraSignaturesSwitch('mac'));

        const updatedPolicy = getUpdatedPolicy();
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
        expect(updatedPolicy.windows).toEqual(windowsBefore);
        expect(updatedPolicy.linux).toEqual(linuxBefore);
      });

      it('renders an absent value as unchecked and enables only that OS when toggled on', async () => {
        for (const os of OS_LIST) {
          delete policy[os].memory_protection.custom_yara_signatures;
        }
        render();

        expect(getCustomYaraSignaturesSwitch('linux')).toHaveAttribute('aria-checked', 'false');

        await userEvent.click(getCustomYaraSignaturesSwitch('linux'));

        const updatedPolicy = getUpdatedPolicy();
        expect(updatedPolicy.linux.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.windows.memory_protection).not.toHaveProperty(
          'custom_yara_signatures'
        );
        expect(updatedPolicy.mac.memory_protection).not.toHaveProperty('custom_yara_signatures');
      });

      it('master toggle off disables custom YARA signatures on every OS', async () => {
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        const updatedPolicy = getUpdatedPolicy();
        for (const os of OS_LIST) {
          expect(updatedPolicy[os].memory_protection.custom_yara_signatures).toBe(false);
        }
      });

      it('master toggle on enables custom YARA signatures on every OS', async () => {
        setMemoryProtectionModeOnAllOses(ProtectionModes.off);
        policy.windows.memory_protection.custom_yara_signatures = false;
        policy.mac.memory_protection.custom_yara_signatures = false;
        delete policy.linux.memory_protection.custom_yara_signatures;
        render();

        await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

        const updatedPolicy = getUpdatedPolicy();
        for (const os of OS_LIST) {
          expect(updatedPolicy[os].memory_protection.custom_yara_signatures).toBe(true);
        }
      });

      it('changing a row from Disable to Detect enables custom YARA signatures on that OS only', async () => {
        policy.mac.memory_protection.mode = ProtectionModes.off;
        policy.mac.memory_protection.custom_yara_signatures = false;
        const windowsBefore = cloneDeep(policy.windows);
        const linuxBefore = cloneDeep(policy.linux);
        render();

        await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Detect$/);

        const updatedPolicy = getUpdatedPolicy();
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(true);
        expect(updatedPolicy.windows).toEqual(windowsBefore);
        expect(updatedPolicy.linux).toEqual(linuxBefore);
      });

      it('changing a row to Disable disables custom YARA signatures on that OS only', async () => {
        const windowsBefore = cloneDeep(policy.windows);
        const linuxBefore = cloneDeep(policy.linux);
        render();

        await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Disable$/);

        const updatedPolicy = getUpdatedPolicy();
        expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
        expect(updatedPolicy.windows).toEqual(windowsBefore);
        expect(updatedPolicy.linux).toEqual(linuxBefore);
      });

      it('switching between Detect and Prevent keeps the stored value', async () => {
        policy.mac.memory_protection.mode = ProtectionModes.detect;
        policy.mac.memory_protection.custom_yara_signatures = false;
        policy.linux.memory_protection.mode = ProtectionModes.prevent;
        policy.linux.memory_protection.custom_yara_signatures = true;
        render();

        await selectOsControlOption(renderResult, testSubj.mac.modeSelect, /^Detect & prevent$/);
        expect(getUpdatedPolicy().mac.memory_protection.custom_yara_signatures).toBe(false);

        await selectOsControlOption(renderResult, testSubj.linux.modeSelect, /^Detect$/);
        expect(getUpdatedPolicy().linux.memory_protection.custom_yara_signatures).toBe(true);
      });

      describe('and license is lower than Enterprise', () => {
        beforeEach(() => {
          const licenseServiceMock = createLicenseServiceMock();
          licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
          licenseServiceMock.isEnterprise.mockReturnValue(false);

          useLicenseMock.mockReturnValue(licenseServiceMock);
        });

        afterEach(() => {
          useLicenseMock.mockReturnValue(licenseServiceMocked);
        });

        it('disables the switch and shows an Enterprise license upsell tooltip', async () => {
          render();

          for (const os of OS_LIST) {
            expect(getCustomYaraSignaturesSwitch(os)).toBeDisabled();
          }

          await userEvent.hover(
            renderResult.getByTestId(testSubj.windows.customYaraSignaturesTooltipIcon)
          );

          expect(
            await renderResult.findByText(CUSTOM_YARA_SIGNATURES_LICENSE_UPSELL)
          ).toBeInTheDocument();
        });

        it('master toggle on clears a leftover true and keeps an absent value absent', async () => {
          setMemoryProtectionModeOnAllOses(ProtectionModes.off);
          policy.windows.memory_protection.custom_yara_signatures = true;
          policy.mac.memory_protection.custom_yara_signatures = false;
          delete policy.linux.memory_protection.custom_yara_signatures;
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

          const updatedPolicy = getUpdatedPolicy();
          expect(updatedPolicy.windows.memory_protection.custom_yara_signatures).toBe(false);
          expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
          expect(updatedPolicy.linux.memory_protection).not.toHaveProperty(
            'custom_yara_signatures'
          );
        });

        it('changing a row from Disable to Detect clears a leftover true and keeps an absent value absent', async () => {
          policy.windows.memory_protection.mode = ProtectionModes.off;
          policy.windows.memory_protection.custom_yara_signatures = true;
          policy.linux.memory_protection.mode = ProtectionModes.off;
          delete policy.linux.memory_protection.custom_yara_signatures;
          render();

          await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Detect$/);
          expect(getUpdatedPolicy().windows.memory_protection.custom_yara_signatures).toBe(false);

          await selectOsControlOption(renderResult, testSubj.linux.modeSelect, /^Detect$/);
          expect(getUpdatedPolicy().linux.memory_protection).not.toHaveProperty(
            'custom_yara_signatures'
          );
        });
      });

      describe('and a serverless PLI upsell message is present', () => {
        const pliUpsellMessage =
          'To apply custom YARA signatures, you must add Endpoint Complete to your project.';

        beforeEach(() => {
          mockedContext.startServices.upselling.setMessages({
            endpoint_custom_yara_signatures: pliUpsellMessage,
          });
        });

        it('disables the switch and shows the PLI upsell tooltip', async () => {
          render();

          expect(getCustomYaraSignaturesSwitch('mac')).toBeDisabled();

          await userEvent.hover(
            renderResult.getByTestId(testSubj.mac.customYaraSignaturesTooltipIcon)
          );

          expect(await renderResult.findByText(pliUpsellMessage)).toBeInTheDocument();
        });

        it('leaves custom_yara_signatures untouched when the master toggle turns memory protection on', async () => {
          setMemoryProtectionModeOnAllOses(ProtectionModes.off);
          render();

          await userEvent.click(renderResult.getByTestId(testSubj.enableDisableSwitch));

          const updatedPolicy = getUpdatedPolicy();
          for (const os of OS_LIST) {
            expect(updatedPolicy[os].memory_protection.custom_yara_signatures).toBe(true);
          }
        });

        it('leaves custom_yara_signatures untouched when a row changes to Disable', async () => {
          render();

          await selectOsControlOption(renderResult, testSubj.windows.modeSelect, /^Disable$/);

          expect(getUpdatedPolicy().windows.memory_protection.custom_yara_signatures).toBe(true);
        });
      });

      describe('and displayed in View mode', () => {
        beforeEach(() => {
          props.mode = 'view';
        });

        it("renders each switch as read-only with that OS's stored value", () => {
          policy.mac.memory_protection.custom_yara_signatures = false;
          render();

          expectIsViewOnly(renderResult.getByTestId(testSubj.card));
          expect(getCustomYaraSignaturesSwitch('windows')).toBeDisabled();
          expect(getCustomYaraSignaturesSwitch('windows')).toHaveAttribute('aria-checked', 'true');
          expect(getCustomYaraSignaturesSwitch('mac')).toBeDisabled();
          expect(getCustomYaraSignaturesSwitch('mac')).toHaveAttribute('aria-checked', 'false');
        });
      });
    });
  });
});
