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
      { channel: 'G0123456789', visibility: 'private', status: 'bound_to_self' },
    ],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

describe('SlackChannelComboBox', () => {
  it.each([
    [false, ['C1', 'G0123456789']],
    [true, ['G0123456789']],
  ])(
    'never suggests a private channel but accepts its link (singleSelection: %s)',
    (singleSelection, expected) => {
      const onChange = jest.fn();
      render(
        <I18nProvider>
          <SlackChannelComboBox
            values={['C1']}
            onChange={onChange}
            ariaLabel="Channels"
            placeholder="Pick"
            testSubject="picker"
            singleSelection={singleSelection}
          />
        </I18nProvider>
      );

      const input = within(screen.getByTestId('picker')).getByRole('combobox');
      fireEvent.change(input, { target: { value: 'G0123' } });
      expect(screen.queryByRole('option', { name: /G0123456789/ })).not.toBeInTheDocument();

      fireEvent.change(input, {
        target: { value: 'https://acme.slack.com/archives/G0123456789' },
      });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenLastCalledWith(expected);
    }
  );
});
