/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { MobileCrashGroup } from '../../../../common/types/mobile';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { MobileCrashGroupsTable } from './mobile_crash_groups_table';

jest.mock('../../../hooks/use_kibana_services');

const group = (overrides: Partial<MobileCrashGroup>): MobileCrashGroup => ({
  fingerprint: 'npe',
  type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  users: 184,
  events: 201,
  sessions: 190,
  firstSeen: { time: '2021-01-18T06:00:00.000Z', release: '4.2.0' },
  lastSeen: { time: '2021-01-18T11:58:00.000Z', release: '4.2.0' },
  newInRelease: '4.2.0',
  ...overrides,
});

// A crash loop on one device: many events, one user.
const GROUPS: MobileCrashGroup[] = [
  group({
    fingerprint: 'loop',
    type: 'java.lang.IllegalStateException',
    message: 'Fragment not attached to an activity.',
    users: 1,
    events: 500,
    sessions: 1,
    firstSeen: { time: '2021-01-18T07:00:00.000Z', release: '4.1.0' },
    lastSeen: { time: '2021-01-18T11:59:00.000Z', release: '4.1.2' },
    newInRelease: null,
  }),
  group({}),
];

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderTable = (crashGroups = GROUPS, onSelect = jest.fn()) =>
  render(
    <MobileCrashGroupsTable crashGroups={crashGroups} isLoading={false} onSelect={onSelect} />,
    { wrapper: Wrapper }
  );

const rowTypes = () =>
  screen.getAllByTestId('digitalExperienceMobileCrashGroup').map((link) => link.textContent);

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('MobileCrashGroupsTable', () => {
  it('ranks the groups by affected users, so a crash loop on one device comes last', () => {
    renderTable();

    expect(rowTypes()).toEqual([
      'java.lang.NullPointerException',
      'java.lang.IllegalStateException',
    ]);
  });

  it("shows each group's message, counts, and first and last seen release", () => {
    renderTable([group({})]);

    const [row] = screen.getAllByRole('row').slice(1);
    expect(within(row).getByText('TrackRecorder is null')).toBeInTheDocument();
    expect(row).toHaveTextContent('184');
    expect(row).toHaveTextContent('201');
    expect(row).toHaveTextContent('190');
    expect(row).toHaveTextContent(/4\.2\.0 · /);
  });

  it('marks new only the groups the newest release brought', () => {
    renderTable();

    expect(screen.getAllByTestId('digitalExperienceMobileCrashGroupNew')).toHaveLength(1);
    expect(screen.getByTestId('digitalExperienceMobileCrashGroupNew')).toHaveTextContent(
      'New in 4.2.0'
    );
  });

  it('sorts by events, the most first, then the fewest', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /Events/ }));
    expect(rowTypes()[0]).toBe('java.lang.IllegalStateException');
    fireEvent.click(screen.getByRole('button', { name: /Events/ }));
    expect(rowTypes()[0]).toBe('java.lang.NullPointerException');
  });

  it('sorts by first seen, the newest first, then the oldest', () => {
    renderTable();

    fireEvent.click(screen.getByRole('button', { name: /First seen/ }));
    expect(rowTypes()[0]).toBe('java.lang.IllegalStateException');
    fireEvent.click(screen.getByRole('button', { name: /First seen/ }));
    expect(rowTypes()[0]).toBe('java.lang.NullPointerException');
  });

  it('keeps the sort and the page when the list reloads', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      group({ fingerprint: `g${index}`, type: `Type${index}`, users: index, events: 100 - index })
    );
    const onSelect = jest.fn();
    const { rerender } = renderTable(many, onSelect);
    fireEvent.click(screen.getByRole('button', { name: /Events/ }));
    fireEvent.click(screen.getByTestId('pagination-button-next'));
    expect(rowTypes()[0]).toBe('Type10');

    // The panel unmounts the table while the list reloads.
    rerender(<MobileCrashGroupsTable crashGroups={many} isLoading onSelect={onSelect} />);
    rerender(
      <MobileCrashGroupsTable crashGroups={[...many]} isLoading={false} onSelect={onSelect} />
    );

    expect(rowTypes()[0]).toBe('Type10');
  });

  it('truncates a long type, with the whole type as its title', () => {
    renderTable([group({ type: 'com.example.app.ui.HomeFragment$Companion$LoadException' })]);

    expect(screen.getByTestId('digitalExperienceMobileCrashGroup')).toHaveAttribute(
      'title',
      'com.example.app.ui.HomeFragment$Companion$LoadException'
    );
  });

  it("opens a group's detail by its fingerprint", () => {
    const onSelect = jest.fn();
    renderTable(GROUPS, onSelect);

    fireEvent.click(screen.getByRole('button', { name: 'java.lang.IllegalStateException' }));

    expect(onSelect).toHaveBeenCalledWith('loop');
  });

  it('says when only the groups that affected the most users are listed', () => {
    renderTable(
      Array.from({ length: 100 }, (_, index) => group({ fingerprint: `g${index}`, users: index }))
    );

    expect(screen.getByText(/The 100 groups that affected the most users/)).toBeInTheDocument();
  });
});
