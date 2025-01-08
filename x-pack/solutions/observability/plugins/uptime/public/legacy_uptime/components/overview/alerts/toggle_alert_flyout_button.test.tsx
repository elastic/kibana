/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen, screen } from '@elastic/eui/lib/test/rtl';
import {
  render,
  forNearestButton,
  makeUptimePermissionsCore,
} from '../../../lib/helper/rtl_helpers';
import { ToggleAlertFlyoutButtonComponent } from './toggle_alert_flyout_button';
import { ToggleFlyoutTranslations } from './translations';

describe('ToggleAlertFlyoutButtonComponent', () => {
  describe('when users have write access to uptime', () => {
    it('enables the button to create a rule', async () => {
      const { getByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: true }) }
      );
      await userEvent.click(getByText('Alerts and rules'));
      expect(
        forNearestButton(getByText)(ToggleFlyoutTranslations.openAlertContextPanelLabel)
      ).toBeEnabled();
    });

    it("does not contain a tooltip explaining why the user can't create alerts", async () => {
      const { getByText, queryByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: true }) }
      );
      await userEvent.click(getByText('Alerts and rules'));
      await waitForEuiPopoverOpen();
      await userEvent.hover(getByText(ToggleFlyoutTranslations.openAlertContextPanelLabel));
      await new Promise((r) => setTimeout(r, 250)); // wait for the default time for tooltips to show up
      await expect(
        queryByText('You need read-write access to Uptime to create alerts in this app.')
      ).not.toBeInTheDocument();
    });
  });

  describe("when users don't have write access to uptime", () => {
    it('disables the button to create a rule', async () => {
      const { getByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: false }) }
      );
      await userEvent.click(getByText('Alerts and rules'));
      expect(
        forNearestButton(getByText)(ToggleFlyoutTranslations.openAlertContextPanelLabel)
      ).toBeDisabled();
    });

    it("contains a tooltip explaining why users can't create rules", async () => {
      const { getByText, findByText } = render(
        <ToggleAlertFlyoutButtonComponent setAlertFlyoutVisible={jest.fn()} />,
        { core: makeUptimePermissionsCore({ save: false }) }
      );
      await userEvent.click(getByText('Alerts and rules'));
      await waitForEuiPopoverOpen();

      await userEvent.hover(
        screen
          .getByTestSubject('xpack.synthetics.openAlertContextPanel')
          .closest('span') as HTMLElement
      );

      expect(
        await findByText('You need read-write access to Uptime to create alerts in this app.')
      ).toBeInTheDocument();
    });
  });
});
