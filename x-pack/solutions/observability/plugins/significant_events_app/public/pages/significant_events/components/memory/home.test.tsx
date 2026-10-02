/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SettingsProps } from '@elastic/charts';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { canonicalizeTag } from '@kbn/nightshift-investigations-plugin/common';
import { MemoryHome } from './home';
import { useMemoryKeywordPages } from './use_memory';
import type { MemorySummary } from './types';

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Settings: (props: Record<string, unknown>) => {
      settingsProps(props);
      return null;
    },
    Partition: () => null,
    Tooltip: () => null,
  };
});

jest.mock('./use_memory');

const settingsProps = jest.fn();

const mockUseMemoryKeywordPages = useMemoryKeywordPages as jest.MockedFunction<
  typeof useMemoryKeywordPages
>;

const summary = (overrides: Partial<MemorySummary> = {}): MemorySummary =>
  ({
    id: 'memory_a',
    slug: 'a',
    title: 'Memory A',
    content: '',
    tags: ['memory', 'kafka', 'redis'],
    archived: false,
    categories: [],
    references: [],
    created_at: '',
    updated_at: '2026-03-01T00:00:00.000Z',
    created_by: '',
    updated_by: '',
    telemetry: { impressions: 1, conversions: 0, last_impression_time: '' },
    usefulness: 0.9,
    confidence: 0.9,
    ...overrides,
  } as MemorySummary);

const PAGES = [
  summary({ id: 'memory_a', title: 'Kafka and Redis', tags: ['memory', 'kafka', 'redis'] }),
  summary({
    id: 'memory_b',
    title: 'Kafka only',
    tags: ['memory', 'kafka'],
    updated_at: '2026-03-02T00:00:00.000Z',
  }),
  summary({
    id: 'memory_c',
    title: 'Redis only',
    tags: ['memory', 'redis'],
    updated_at: '2026-03-03T00:00:00.000Z',
  }),
];

/**
 * Stands in for the server: AND across keywords, matching each keyword against
 * any spelling of it, which is what the route and the store do with the terms.
 */
const serverFilter = (pages: MemorySummary[], tags: readonly string[]): MemorySummary[] => {
  const keywords = [...new Set(tags.map(canonicalizeTag).filter((tag) => tag !== null))];
  if (keywords.length === 0) return pages;
  return pages.filter((page) =>
    keywords.every((keyword) =>
      page.tags.some((tag) => canonicalizeTag(tag) === keyword || tags.includes(tag))
    )
  );
};

const stats = { total: PAGES.length, archived: 0 };

/** Every memory title the "Recently updated" list is showing. */
/** Every memory title the home lists, deduplicated across its two lists. */
const listedTitles = () => [
  ...new Set(screen.queryAllByTestId(/^nightshiftMemoryRow-/).map((row) => row.textContent ?? '')),
];

/** The chart reports a cell click; the view answers by updating its selection. */
const clickCell = (keyword: string) => {
  const onElementClick = settingsProps.mock.calls.at(-1)?.[0]
    .onElementClick as SettingsProps['onElementClick'];
  act(() => {
    onElementClick!([[{ type: 'layerValue', groupByRollup: keyword }]] as unknown as Parameters<
      NonNullable<SettingsProps['onElementClick']>
    >[0]);
  });
};

const renderHome = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <MemoryHome pages={PAGES} stats={stats} onSelectPage={jest.fn()} />
      </I18nProvider>
    </EuiProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMemoryKeywordPages.mockImplementation(
    (tags: readonly string[] = []) =>
      ({
        data: { pages: serverFilter(PAGES, tags), total: PAGES.length, stats },
      } as unknown as ReturnType<typeof useMemoryKeywordPages>)
  );
});

describe('MemoryHome keyword filtering', () => {
  it('lists every memory until a keyword is selected', () => {
    renderHome();

    expect(listedTitles()).toHaveLength(PAGES.length);
    expect(mockUseMemoryKeywordPages).toHaveBeenCalledWith([]);
  });

  it('narrows the lists and the chart to the keyword whose cell was clicked', () => {
    renderHome();

    clickCell('kafka');

    // The server is asked for the filtered set, spellings included.
    expect(mockUseMemoryKeywordPages).toHaveBeenLastCalledWith(['kafka']);
    const titles = listedTitles().join(' ');
    expect(titles).toContain('Kafka and Redis');
    expect(titles).toContain('Kafka only');
    expect(titles).not.toContain('Redis only');
  });

  it('ANDs two selected keywords', () => {
    renderHome();

    clickCell('kafka');
    clickCell('redis');

    expect(mockUseMemoryKeywordPages).toHaveBeenLastCalledWith(['kafka', 'redis']);
    const titles = listedTitles().join(' ');
    // Only the one memory carrying both survives.
    expect(titles).toContain('Kafka and Redis');
    expect(titles).not.toContain('Kafka only');
  });

  it('removes a keyword when its chip is clicked again', async () => {
    renderHome();
    clickCell('kafka');
    clickCell('redis');

    await userEvent.click(screen.getByTestId('nightshiftMemoryKeywordChip-redis'));

    expect(mockUseMemoryKeywordPages).toHaveBeenLastCalledWith(['kafka']);
    // Back to the memories carrying `kafka` alone, so `Redis only` is gone again.
    const titles = listedTitles().join(' ');
    expect(titles).toContain('Kafka and Redis');
    expect(titles).toContain('Kafka only');
    expect(titles).not.toContain('Redis only');
  });

  it('clears the whole selection at once', async () => {
    renderHome();
    clickCell('kafka');

    await userEvent.click(screen.getByTestId('nightshiftMemoryClearKeywords'));

    expect(mockUseMemoryKeywordPages).toHaveBeenLastCalledWith([]);
    expect(listedTitles()).toHaveLength(PAGES.length);
  });

  it('shows the Space-wide archived count, which does not follow the keyword selection', () => {
    // The sidebar lists Active by default, so the archived number used to be
    // counted inside a listing that excludes archived memories and read zero.
    // It is the Space's own count now, and it stays put when a keyword narrows
    // the view, because the Archived list is not keyword-filtered.
    const archived = 4;
    render(
      <EuiProvider>
        <I18nProvider>
          <MemoryHome
            pages={PAGES}
            stats={{ total: PAGES.length, archived }}
            onSelectPage={jest.fn()}
          />
        </I18nProvider>
      </EuiProvider>
    );
    const header = screen.getByTestId('nightshiftMemoryHomeStats');
    expect(header).toHaveTextContent(`${archived} archived`);

    clickCell('kafka');
    expect(header).toHaveTextContent(`${archived} archived`);
  });
});
