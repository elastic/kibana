/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { NIGHTSHIFT_EBT_ACTIONS } from '../../../../../common/ebt_constants';
import { slackTriggerLabels } from '../../../utils/trigger_display';
import { TriggerPicker } from './trigger_picker';

describe('TriggerPicker', () => {
  it('tags each selectable trigger with its kind as detail', () => {
    render(
      <I18nProvider>
        <TriggerPicker
          onSelect={jest.fn()}
          button={(toggle) => (
            <button type="button" onClick={toggle}>
              open
            </button>
          )}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText('open'));

    const [[kind, label]] = Object.entries(slackTriggerLabels);
    const option = screen.getByRole('option', { name: new RegExp(label) });
    expect(option).toHaveAttribute(
      'data-ebt-action',
      NIGHTSHIFT_EBT_ACTIONS.SELECT_AUTOMATION_TRIGGER
    );
    expect(option).toHaveAttribute('data-ebt-detail', kind);
  });
});
