/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '../../utils/test_helper';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { inventoryThresholdAlertEs } from '../../rules/fixtures/example_alerts';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import { fireEvent } from '@testing-library/react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';

const tabsData = [
  { name: 'Overview', subj: 'overviewTab' },
  { name: 'Metadata', subj: 'metadataTab' },
];

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('AlertsFlyoutBody', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();
  let flyout: ReturnType<typeof render>;

  const setup = (id: string) => {
    flyout = render(
      <AlertsFlyoutBody
        tableId={id}
        alert={inventoryThresholdAlertEs}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistryMock}
      />
    );
  };

  it('should render View rule detail link', async () => {
    setup('test');
    expect(flyout.getByTestId('viewRuleDetailsFlyout')).toBeInTheDocument();
  });

  it('should NOT render View rule detail link for RULE_DETAILS_PAGE_ID', async () => {
    setup(RULE_DETAILS_PAGE_ID);
    expect(flyout.queryByTestId('viewRuleDetailsFlyout')).not.toBeInTheDocument();
  });

  describe('tabs', () => {
    beforeEach(() => {
      setup('test');
    });

    tabsData.forEach(({ name: tab }) => {
      test(`should render the ${tab} tab`, () => {
        flyout.debug();
        expect(flyout.getByText(tab)).toBeTruthy();
      });
    });

    test('the Overview tab should be selected by default', () => {
      expect(
        flyout.container.querySelector(
          '[data-test-subj="defaultAlertFlyoutTabs"] .euiTab-isSelected .euiTab__content'
        )!.innerHTML
      ).toContain('Overview');
    });

    tabsData.forEach(({ subj, name }) => {
      test(`should render the ${name} tab panel`, () => {
        const tab = flyout.container.querySelector(
          `[data-test-subj="defaultAlertFlyoutTabs"] [role="tablist"] [data-test-subj="${subj}"]`
        );
        fireEvent.click(tab!);
        expect(
          flyout.container.querySelector(
            `[data-test-subj="defaultAlertFlyoutTabs"] [role="tabpanel"] [data-test-subj="${subj}Panel"]`
          )
        ).toBeTruthy();
      });
    });
  });
});
