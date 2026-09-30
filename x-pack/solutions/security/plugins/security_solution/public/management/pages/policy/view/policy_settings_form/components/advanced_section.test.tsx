/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectIsViewOnly, getPolicySettingsFormTestSubjects, exactMatchText } from '../mocks';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import React from 'react';
import { useLicense as _useLicense } from '../../../../../../common/hooks/use_license';
import { createLicenseServiceMock } from '../../../../../../../common/license/mocks';
import { licenseService as licenseServiceMocked } from '../../../../../../common/hooks/__mocks__/use_license';
import type { AdvancedSectionProps } from './advanced_section';
import { AdvancedSection } from './advanced_section';
import userEvent from '@testing-library/user-event';
import { AdvancedPolicySchema } from '../../../../../../../common/endpoint/service/policy/advanced_policy_schema';
import { within } from '@testing-library/react';
import { set } from '@kbn/safer-lodash-set';

jest.setTimeout(15_000); // Costly tests, hitting 2 seconds execution time locally
jest.mock('../../../../../../common/hooks/use_license');

const useLicenseMock = _useLicense as jest.Mock;

const CUSTOM_YARA_RESCAN_INTERVAL_KEYS = [
  'windows.advanced.memory_protection.user_yara_rescan_interval_seconds',
  'mac.advanced.memory_protection.user_yara_rescan_interval_seconds',
  'linux.advanced.memory_protection.user_yara_rescan_interval_seconds',
] as const;

describe('Policy Advanced Settings section', () => {
  const testSubj = getPolicySettingsFormTestSubjects('test').advancedSection;

  let formProps: AdvancedSectionProps;
  let mockedContext: AppContextTestRender;
  let render: (expanded?: boolean) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  const clickShowHideButton = async () => {
    await userEvent.click(renderResult.getByTestId(testSubj.showHideButton));
  };

  const getCysRowContainer = (key: (typeof CUSTOM_YARA_RESCAN_INTERVAL_KEYS)[number]) =>
    testSubj.settingRowTestSubjects(key).container;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    formProps = {
      policy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
        .config.policy.value,
      onChange: jest.fn(),
      mode: 'edit',
      'data-test-subj': testSubj.container,
    };

    render = async (expanded = true) => {
      renderResult = mockedContext.render(<AdvancedSection {...formProps} />);

      if (expanded) {
        await clickShowHideButton();
        expect(renderResult.getByTestId(testSubj.settingsContainer));
      }

      return renderResult;
    };
  });

  it('should render initially collapsed', async () => {
    await render(false);

    expect(renderResult.queryByTestId(testSubj.settingsContainer)).toBeNull();
  });

  it('should expand and collapse section when button is clicked', async () => {
    await render(false);

    expect(renderResult.queryByTestId(testSubj.settingsContainer)).toBeNull();

    await clickShowHideButton();

    expect(renderResult.getByTestId(testSubj.settingsContainer));
  });

  it('should show warning callout', async () => {
    const { getByTestId } = await render(true);

    expect(getByTestId(testSubj.warningCallout));
  });

  it('should render all advanced options', async () => {
    const fieldsWithDefaultValues = [
      'mac.advanced.capture_env_vars',
      'linux.advanced.capture_env_vars',
      'mac.ransomware.mode',
    ];

    await render(true);

    const expectedRenderedOptions = AdvancedPolicySchema.filter(
      (advancedOption) =>
        !(CUSTOM_YARA_RESCAN_INTERVAL_KEYS as readonly string[]).includes(advancedOption.key)
    );

    expectedRenderedOptions.forEach((advancedOption) => {
      const optionTestSubj = testSubj.settingRowTestSubjects(advancedOption.key);
      const renderedRow = within(renderResult.getByTestId(optionTestSubj.container));

      expect(renderedRow.getByTestId(optionTestSubj.textField));
      expect(renderedRow.getByTestId(optionTestSubj.label)).toHaveTextContent(
        exactMatchText(advancedOption.key)
      );
      expect(renderedRow.getByTestId(optionTestSubj.versionInfo)).toHaveTextContent(
        advancedOption.first_supported_version
      );

      if (advancedOption.last_supported_version) {
        expect(renderedRow.getByTestId(optionTestSubj.versionInfo)).toHaveTextContent(
          advancedOption.last_supported_version
        );
      }

      if (fieldsWithDefaultValues.includes(advancedOption.key)) {
        expect(renderedRow.getByTestId<HTMLInputElement>(optionTestSubj.textField).value).not.toBe(
          ''
        );
      } else {
        expect(renderedRow.getByTestId<HTMLInputElement>(optionTestSubj.textField).value).toBe('');
      }
    });
  });

  describe('and when license is lower than Platinum', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should not render options that require platinum license', async () => {
      await render(true);

      AdvancedPolicySchema.forEach((advancedOption) => {
        if (advancedOption.license === 'platinum') {
          expect(
            renderResult.queryByTestId(
              testSubj.settingRowTestSubjects(advancedOption.key).container
            )
          ).toBeNull();
        } else if (advancedOption.license && advancedOption.license !== 'enterprise') {
          throw new Error(
            `${advancedOption.key}: Unknown license value: ${advancedOption.license}`
          );
        }
      });
    });
  });

  describe('and when rendered in View mode', () => {
    beforeEach(() => {
      formProps.mode = 'view';
    });

    it('should render with no form fields', async () => {
      await render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.settingsContainer));
    });

    it('should render options in expected content', async () => {
      const option1 = AdvancedPolicySchema[0];
      const option2 = AdvancedPolicySchema[4];

      set(formProps.policy, option1.key, 'foo');
      set(formProps.policy, option2.key, ''); // test empty value

      const { getByTestId } = await render();

      expectIsViewOnly(renderResult.getByTestId(testSubj.settingsContainer));
      expect(getByTestId(testSubj.settingRowTestSubjects(option1.key).container)).toHaveTextContent(
        exactMatchText('linux.advanced.agent.connection_delayInfo 7.9+foo')
      );
      expect(getByTestId(testSubj.settingRowTestSubjects(option2.key).container)).toHaveTextContent(
        exactMatchText('linux.advanced.artifacts.global.intervalInfo 7.9+—')
      );
    });
  });

  describe('and when license is lower than Enterprise', () => {
    beforeEach(() => {
      const licenseServiceMock = createLicenseServiceMock();
      licenseServiceMock.isEnterprise.mockReturnValue(false);

      useLicenseMock.mockReturnValue(licenseServiceMock);
      mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: true });
    });

    afterEach(() => {
      useLicenseMock.mockReturnValue(licenseServiceMocked);
    });

    it('should not render options that require enterprise license', async () => {
      await render(true);

      for (const advancedOption of AdvancedPolicySchema) {
        if (advancedOption.license === 'enterprise') {
          expect(
            renderResult.queryByTestId(
              testSubj.settingRowTestSubjects(advancedOption.key).container
            )
          ).toBeNull();
        }
      }
    });
  });

  describe('custom YARA signatures advanced settings', () => {
    it('should hide custom YARA rescan interval options when the experimental flag is off', async () => {
      await render(true);

      for (const key of CUSTOM_YARA_RESCAN_INTERVAL_KEYS) {
        expect(renderResult.queryByTestId(getCysRowContainer(key))).toBeNull();
      }
    });

    describe('and custom YARA signatures experimental flag is enabled', () => {
      beforeEach(() => {
        mockedContext.setExperimentalFlag({ customYaraSignaturesEnabled: true });
      });

      it('should show custom YARA rescan interval options on Enterprise when no PLI upsell is present', async () => {
        await render(true);

        for (const key of CUSTOM_YARA_RESCAN_INTERVAL_KEYS) {
          expect(renderResult.getByTestId(getCysRowContainer(key))).toBeInTheDocument();
        }
      });

      it('should persist an edited custom YARA rescan interval value on the matching policy path', async () => {
        const key = 'windows.advanced.memory_protection.user_yara_rescan_interval_seconds';
        await render(true);

        const input = renderResult.getByTestId(key);
        await userEvent.click(input);
        await userEvent.paste('45');

        const updatedPolicy = (formProps.onChange as jest.Mock).mock.calls.at(-1)[0].updatedPolicy;
        expect(
          updatedPolicy.windows.advanced.memory_protection.user_yara_rescan_interval_seconds
        ).toBe('45');
      });

      describe('and license is lower than Enterprise', () => {
        beforeEach(() => {
          const licenseServiceMock = createLicenseServiceMock();
          licenseServiceMock.isEnterprise.mockReturnValue(false);

          useLicenseMock.mockReturnValue(licenseServiceMock);
        });

        afterEach(() => {
          useLicenseMock.mockReturnValue(licenseServiceMocked);
        });

        it('should hide custom YARA rescan interval options when license is below Enterprise', async () => {
          await render(true);

          for (const key of CUSTOM_YARA_RESCAN_INTERVAL_KEYS) {
            expect(renderResult.queryByTestId(getCysRowContainer(key))).toBeNull();
          }
        });
      });

      it('should hide custom YARA rescan interval options when a CYS PLI upsell message is present', async () => {
        mockedContext.startServices.upselling.setMessages({
          endpoint_custom_yara_signatures:
            'To apply custom YARA signatures, you must add Endpoint Complete to your project.',
        });

        await render(true);

        for (const key of CUSTOM_YARA_RESCAN_INTERVAL_KEYS) {
          expect(renderResult.queryByTestId(getCysRowContainer(key))).toBeNull();
        }
      });
    });
  });
});
