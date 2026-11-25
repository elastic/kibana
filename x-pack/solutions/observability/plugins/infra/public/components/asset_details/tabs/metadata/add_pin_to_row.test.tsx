/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { AddMetadataPinToRow } from './add_pin_to_row';

const renderPin = (pinnedItems: string[]) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <AddMetadataPinToRow fieldName="host.name" pinnedItems={pinnedItems} onPinned={jest.fn()} />
      </I18nProvider>
    </EuiProvider>
  );

describe('AddMetadataPinToRow', () => {
  it.each([
    { pinnedItems: [], name: 'Pin host.name', tooltip: 'Pin field' },
    { pinnedItems: ['host.name'], name: 'Unpin host.name', tooltip: 'Unpin field' },
  ])(
    'does not describe the "$name" button with its visible tooltip for screen readers',
    async ({ pinnedItems, name, tooltip }) => {
      renderPin(pinnedItems);
      const button = screen.getByRole('button', { name });

      focusEuiToolTipTrigger(button);

      expect(await screen.findByRole('tooltip')).toHaveTextContent(tooltip);
      expect(button).not.toHaveAttribute('aria-describedby');
    }
  );
});
