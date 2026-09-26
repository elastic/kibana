/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { Callouts } from './callouts';
import { useAssetDetailsUrlState } from '../hooks/use_asset_details_url_state';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { ContentTabIds } from '../types';

jest.mock('../hooks/use_asset_details_url_state');
jest.mock('../hooks/use_asset_details_render_props');
jest.mock('../hooks/use_tab_switcher');

const useAssetDetailsUrlStateMock = useAssetDetailsUrlState as jest.MockedFunction<
  typeof useAssetDetailsUrlState
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

const CALLOUT_TEST_SUBJ = 'infraAssetDetailsLegacyMetricAlertCallout';

// `cpu`, `rx` and `tx` are the host inventory model's legacy metrics; their V2 counterparts are the
// current definitions and must not warn.
const LEGACY_METRICS = ['cpu', 'rx', 'tx'] as const;
const CURRENT_METRICS = ['cpuV2', 'rxV2', 'txV2'] as const;

const mockUrlState = (state: { alertMetric?: string; tabId?: ContentTabIds } | null) => {
  useAssetDetailsUrlStateMock.mockReturnValue([state, jest.fn()] as unknown as ReturnType<
    typeof useAssetDetailsUrlState
  >);
};

const mockRenderProps = (entityType: InventoryItemType = 'host') => {
  useAssetDetailsRenderPropsContextMock.mockReturnValue({
    entity: { id: 'host-1', name: 'host-1', type: entityType },
  } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
};

const mockActiveTab = (activeTabId: ContentTabIds) => {
  useTabSwitcherContextMock.mockReturnValue({
    activeTabId,
  } as unknown as ReturnType<typeof useTabSwitcherContext>);
};

const renderCallouts = () =>
  render(
    <I18nProvider>
      <Callouts />
    </I18nProvider>
  );

describe('Callouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockRenderProps();
    mockActiveTab(ContentTabIds.OVERVIEW);
  });

  it.each(LEGACY_METRICS)('warns that the %s definition was updated', (metric) => {
    mockUrlState({ alertMetric: metric });

    renderCallouts();

    expect(screen.getByTestId(CALLOUT_TEST_SUBJ)).toBeVisible();
  });

  it.each(CURRENT_METRICS)('does not warn for the current %s definition', (metric) => {
    mockUrlState({ alertMetric: metric });

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('warns on the metrics tab as well as the overview tab', () => {
    mockUrlState({ alertMetric: 'cpu' });
    mockActiveTab(ContentTabIds.METRICS);

    renderCallouts();

    expect(screen.getByTestId(CALLOUT_TEST_SUBJ)).toBeVisible();
  });

  it('does not warn on tabs the callout is not scoped to', () => {
    mockUrlState({ alertMetric: 'cpu' });
    mockActiveTab(ContentTabIds.METADATA);

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not warn when no alert metric was followed through', () => {
    mockUrlState(null);

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not warn for an unknown alert metric', () => {
    mockUrlState({ alertMetric: 'notAMetric' });

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not warn for entity types without legacy metrics', () => {
    mockUrlState({ alertMetric: 'cpu' });
    mockRenderProps('container');

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('stays dismissed for the same metric once dismissed', async () => {
    mockUrlState({ alertMetric: 'cpu' });

    const { unmount } = renderCallouts();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss this callout' }));
    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
    unmount();

    renderCallouts();

    expect(screen.queryByTestId(CALLOUT_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('keeps warning for another metric after one was dismissed', async () => {
    mockUrlState({ alertMetric: 'cpu' });

    const { unmount } = renderCallouts();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss this callout' }));
    unmount();

    mockUrlState({ alertMetric: 'rx' });
    renderCallouts();

    expect(screen.getByTestId(CALLOUT_TEST_SUBJ)).toBeVisible();
  });
});
