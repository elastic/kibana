/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MetricsTemplate } from './metrics_template';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { HOST_METRIC_GROUP_TITLES } from '../../translations';

jest.mock('../../hooks/use_asset_details_render_props');
jest.mock('../../hooks/use_tab_switcher');

const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;

const SECTION_IDS = ['cpu', 'memory', 'network', 'disk', 'log'] as const;

// Labels come from the same source the metric sections render, so a copy change to a section
// title is caught here instead of silently drifting from the quick-access list.
const SECTIONS = SECTION_IDS.map((id) => ({ id, label: HOST_METRIC_GROUP_TITLES[id] }));

// The initial scroll is deferred by 100ms; failed attempts are retried on a 600ms timer.
const INITIAL_SCROLL_DELAY = 100;
const SCROLL_RETRY_DELAY = 600;
const SCROLL_RETRIES = 5;

/**
 * `MetricsTemplate` builds its quick-access list from the `data-section-id` of each child it
 * receives a ref for, so children must forward their ref to a DOM node. `hasChart` controls
 * whether the section looks rendered to `scrollToSection`, which waits for a chart panel.
 */
const Section = React.forwardRef<HTMLDivElement, { id: string; label: string; hasChart?: boolean }>(
  ({ id, label, hasChart }, ref) => (
    <div ref={ref} data-section-id={id}>
      {label}
      {hasChart ? <div className="euiPanel" /> : null}
    </div>
  )
);

const mockSetScrollTo = jest.fn();
const scrolledSectionIds: string[] = [];

const renderMetricsTemplate = ({
  scrollTo,
  sectionsWithCharts = [],
}: { scrollTo?: string; sectionsWithCharts?: string[] } = {}) => {
  useTabSwitcherContextMock.mockReturnValue({
    scrollTo,
    setScrollTo: mockSetScrollTo,
  } as unknown as ReturnType<typeof useTabSwitcherContext>);

  const buildTemplate = (withCharts: string[]) => (
    <I18nProvider>
      <MetricsTemplate>
        {SECTIONS.map(({ id, label }) => (
          <Section key={id} id={id} label={label} hasChart={withCharts.includes(id)} />
        ))}
      </MetricsTemplate>
    </I18nProvider>
  );

  const { rerender, unmount } = render(buildTemplate(sectionsWithCharts));

  // Quick-access items are collected from the section refs during commit and read on the next
  // render, which the browser triggers through the quick-access container's ResizeObserver.
  rerender(buildTemplate(sectionsWithCharts));

  return {
    unmount,
    renderCharts: (withCharts: string[]) => rerender(buildTemplate(withCharts)),
  };
};

const advanceTimersBy = (ms: number) => act(() => jest.advanceTimersByTime(ms));

describe('MetricsTemplate', () => {
  beforeAll(() => {
    // Quick-access labels come from each section's `innerText`, which jsdom does not implement.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent;
      },
    });

    // jsdom has no layout, so `scrollIntoView` is missing entirely. Record the section each
    // call targets so the tests can assert what would have been scrolled to.
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value(this: HTMLElement) {
        scrolledSectionIds.push(this.getAttribute('data-section-id') ?? '');
      },
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'innerText');
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    scrolledSectionIds.length = 0;

    useAssetDetailsRenderPropsContextMock.mockReturnValue({
      renderMode: { mode: 'page' },
    } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders one quick-access item per metric section', () => {
    renderMetricsTemplate();

    for (const { id, label } of SECTIONS) {
      expect(screen.getByTestId(`infraMetricsQuickAccessItem${id}`)).toHaveTextContent(label);
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(SECTIONS.length);
  });

  it.each(SECTIONS.map(({ id }) => id))(
    'selects the %s section when its quick-access item is clicked',
    async (id) => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderMetricsTemplate();

      await user.click(screen.getByTestId(`infraMetricsQuickAccessItem${id}`));

      expect(mockSetScrollTo).toHaveBeenCalledWith(id);
    }
  );

  it('does not reselect the section that is already active', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderMetricsTemplate({ scrollTo: 'cpu' });

    await user.click(screen.getByTestId('infraMetricsQuickAccessItemcpu'));

    expect(mockSetScrollTo).not.toHaveBeenCalled();
  });

  describe('scrolling to the selected section', () => {
    it('scrolls to the selected section once the initial delay elapses', () => {
      renderMetricsTemplate({ scrollTo: 'memory', sectionsWithCharts: ['memory'] });

      expect(scrolledSectionIds).toEqual([]);

      advanceTimersBy(INITIAL_SCROLL_DELAY);

      expect(scrolledSectionIds).toEqual(['memory']);
    });

    it('waits for the section charts to render before scrolling', () => {
      const { renderCharts } = renderMetricsTemplate({ scrollTo: 'memory' });

      advanceTimersBy(INITIAL_SCROLL_DELAY);
      advanceTimersBy(SCROLL_RETRY_DELAY);

      expect(scrolledSectionIds).toEqual([]);

      renderCharts(['memory']);
      advanceTimersBy(SCROLL_RETRY_DELAY);

      expect(scrolledSectionIds).toEqual(['memory']);
    });

    it('stops retrying once the attempts are exhausted', () => {
      const { renderCharts } = renderMetricsTemplate({ scrollTo: 'memory' });

      advanceTimersBy(INITIAL_SCROLL_DELAY);
      advanceTimersBy(SCROLL_RETRY_DELAY * SCROLL_RETRIES);

      renderCharts(['memory']);
      advanceTimersBy(SCROLL_RETRY_DELAY * SCROLL_RETRIES);

      expect(scrolledSectionIds).toEqual([]);
    });

    it('scrolls again when the quick-access item of the active section is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderMetricsTemplate({ scrollTo: 'cpu', sectionsWithCharts: ['cpu'] });

      advanceTimersBy(INITIAL_SCROLL_DELAY);
      scrolledSectionIds.length = 0;

      await user.click(screen.getByTestId('infraMetricsQuickAccessItemcpu'));

      expect(mockSetScrollTo).not.toHaveBeenCalled();
      expect(scrolledSectionIds).toEqual(['cpu']);
    });

    it('drops a pending retry when the tab is unmounted', () => {
      const { renderCharts, unmount } = renderMetricsTemplate({ scrollTo: 'memory' });

      advanceTimersBy(INITIAL_SCROLL_DELAY);
      renderCharts(['memory']);
      unmount();

      advanceTimersBy(SCROLL_RETRY_DELAY);

      expect(scrolledSectionIds).toEqual([]);
    });
  });
});
