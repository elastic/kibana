/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { createUiSettingsMock } from '../test_utils/ui_settings_mock';
import { BarList } from './bar_list';

jest.mock('../hooks/use_kibana_services');

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('BarList', () => {
  it('lists each row with its label, count, share and a bar against the total', () => {
    render(
      <BarList
        aria-label="Browsers"
        total={40}
        items={[
          { key: 'Chrome', value: 30, label: <a href="/chrome">Chrome</a> },
          { key: 'Safari', value: 10 },
        ]}
      />,
      { wrapper: EuiProvider }
    );

    const [chrome, safari] = within(screen.getByRole('list', { name: 'Browsers' })).getAllByRole(
      'listitem'
    );
    expect(within(chrome).getByRole('link', { name: 'Chrome' })).toBeInTheDocument();
    expect(chrome).toHaveTextContent('30 · 75%');
    expect(within(chrome).getByRole('progressbar')).toHaveAttribute('max', '40');
    expect(safari).toHaveTextContent('Safari');
    expect(safari).toHaveTextContent('10 · 25%');
  });

  it('shows no share and a non-zero bar maximum without a total', () => {
    render(<BarList aria-label="Clicks" total={0} items={[{ key: '#buy', value: 0 }]} />, {
      wrapper: EuiProvider,
    });

    expect(screen.getByRole('listitem')).not.toHaveTextContent('%');
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '1');
  });
});
