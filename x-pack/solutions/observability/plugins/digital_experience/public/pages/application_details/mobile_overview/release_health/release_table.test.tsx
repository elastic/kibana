/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { OTHER_RELEASE_KEY } from '../../../../../common/mobile/releases';
import type { MobileReleaseRow } from '../../../../../common/types/mobile';
import { createFormatters, useFormatters } from '../../../../hooks/use_formatters';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { getReleaseColors } from './release_colors';
import { TEST_VIS_COLORS } from './release_colors.test_helpers';
import { ReleaseTable } from './release_table';

jest.mock('../../../../hooks/use_formatters', () => ({
  ...jest.requireActual('../../../../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));

const RELEASES: MobileReleaseRow[] = [
  { release: '2.0.0', isOther: false, sessions: 1200, users: 300, errorRate: 0.25 },
  { release: '1.0.0', isOther: false, sessions: 99, users: 40, errorRate: null },
  { release: OTHER_RELEASE_KEY, isOther: true, sessions: 10, users: 5, errorRate: null },
];

const renderTable = () =>
  render(
    <ReleaseTable releases={RELEASES} colors={getReleaseColors(RELEASES, TEST_VIS_COLORS)} />,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );

beforeEach(() => {
  jest.mocked(useFormatters).mockReturnValue(createFormatters(createUiSettingsMock()));
});

describe('ReleaseTable', () => {
  it('has a column for the release, sessions, users and error rate', () => {
    renderTable();

    ['Release', 'Sessions', 'Users', 'Error rate'].forEach((name) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    });
  });

  it('labels the "Other" row, and keeps it last', () => {
    renderTable();

    const rows = screen.getAllByRole('row').slice(1);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('2.0.0');
    expect(within(rows[2]).getByText('Other')).toBeInTheDocument();
  });

  it('shows "Not enough data" instead of an error rate below the floor, and the rate otherwise', () => {
    renderTable();

    expect(
      within(screen.getByTestId('digitalExperienceMobileReleaseRow-2.0.0')).queryByText(
        'Not enough data'
      )
    ).toBeNull();
    expect(screen.getByTestId('digitalExperienceMobileReleaseRow-2.0.0')).toHaveTextContent('0.25');
    expect(
      within(screen.getByTestId('digitalExperienceMobileReleaseRow-1.0.0')).getByText(
        'Not enough data'
      )
    ).toBeInTheDocument();
  });
});
