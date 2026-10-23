/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { SlackChannelComboBox } from './slack_channel_combo_box';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { application: { getUrlForApp: () => '' } } }),
}));

jest.mock('../../../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [
      { channel: 'C1', displayName: 'alerts', visibility: 'public', status: 'bound_to_self' },
      { channel: 'G1', visibility: 'private', status: 'bound_to_self' },
    ],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

describe('SlackChannelComboBox', () => {
  it.each([false, true])(
    'hides private channels but keeps a stored one removable (singleSelection: %s)',
    (singleSelection) => {
      const onChange = jest.fn();
      render(
        <I18nProvider>
          <SlackChannelComboBox
            values={['G1']}
            onChange={onChange}
            ariaLabel="Channels"
            placeholder="Pick"
            testSubject="picker"
            singleSelection={singleSelection}
          />
        </I18nProvider>
      );

      const picker = screen.getByTestId('picker');
      expect(screen.getByTestId('pickerHelp')).toHaveTextContent(
        'Private channels aren’t available for automations yet: Private · G1'
      );

      fireEvent.click(within(picker).getByTestId('comboBoxToggleListButton'));
      expect(screen.getByRole('option', { name: '#alerts' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /G1/ })).not.toBeInTheDocument();

      fireEvent.click(within(picker).getByTestId('comboBoxClearButton'));
      expect(onChange).toHaveBeenLastCalledWith([]);
    }
  );
});
