/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { EntityAnalyticsDashboardAttachment } from './entity_analytics_dashboard_attachment';
import { createEntityAnalyticsDashboardAttachmentDefinition } from './entity_analytics_dashboard_attachment';
import { navigateToEntityAnalyticsHomePageInApp } from './entity_explore_navigation';

interface ResizeDimensions {
  width: number;
  height: number;
}

const RESIZE_CALLBACK_KEY = '__eaDashboardOnResize';

jest.mock('@elastic/eui', () => {
  const React_ = jest.requireActual('react');
  const actual = jest.requireActual('@elastic/eui');

  const EuiResizeObserver = ({
    onResize,
    children,
  }: {
    onResize: (d: ResizeDimensions) => void;
    children: (ref: (el: HTMLElement | null) => void) => React.ReactElement;
  }) => {
    (global as unknown as Record<string, unknown>)[RESIZE_CALLBACK_KEY] = onResize;
    return children(() => {});
  };

  const EuiFlexGroup = React_.forwardRef(
    (
      {
        direction = 'row',
        alignItems,
        gutterSize,
        responsive,
        justifyContent,
        wrap,
        component: _component,
        children,
        ...rest
      }: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.Ref<HTMLDivElement>
    ) =>
      React_.createElement(
        'div',
        {
          ref,
          'data-direction': direction,
          'data-align-items': alignItems ?? '',
          ...rest,
        },
        children
      )
  );

  const EuiFlexItem = ({
    grow,
    component: _component,
    children,
    ...rest
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React_.createElement('div', { 'data-grow': String(grow), ...rest }, children);

  return {
    ...actual,
    EuiResizeObserver,
    EuiFlexGroup,
    EuiFlexItem,
  };
});

jest.mock('../../entity_analytics/components/home/risk_level_breakdown_table', () => ({
  RiskLevelBreakdownTable: () => <div data-test-subj="riskLevelBreakdownTableMock" />,
}));

jest.mock('../../entity_analytics/components/risk_score_donut_chart', () => ({
  RiskScoreDonutChart: () => <div data-test-subj="riskScoreDonutChartMock" />,
}));

jest.mock('./entity_list_table', () => ({
  EntityListTable: ({ closeCanvas }: { closeCanvas?: () => void }) => (
    <div
      data-test-subj="entityListTableMock"
      data-has-close-canvas={closeCanvas ? 'true' : 'false'}
    />
  ),
}));

jest.mock('./entity_explore_navigation', () => ({
  navigateToEntityAnalyticsHomePageInApp: jest.fn(),
}));

const triggerResize = (dimensions: ResizeDimensions) => {
  const onResize = (global as unknown as Record<string, unknown>)[RESIZE_CALLBACK_KEY] as
    | ((d: ResizeDimensions) => void)
    | undefined;
  if (!onResize) {
    throw new Error('EuiResizeObserver onResize was never registered');
  }
  act(() => {
    onResize(dimensions);
  });
};

const makeAttachment = (): EntityAnalyticsDashboardAttachment =>
  ({
    id: 'ea-dashboard-1',
    type: 'security.entity_analytics_dashboard',
    data: {
      attachmentLabel: 'Entity Analytics Dashboard',
      summary: 'Top 5 riskiest users.',
      entities: [
        { entity_type: 'user', identifier: 'alice' },
        { entity_type: 'host', identifier: 'beta' },
      ],
    },
  } as unknown as EntityAnalyticsDashboardAttachment);

const renderCanvas = (
  overrides: { searchSession?: ISessionService; closeCanvas?: () => void } = {}
) => {
  const application = applicationServiceMock.createStartContract();
  const definition = createEntityAnalyticsDashboardAttachmentDefinition({
    application,
    searchSession: overrides.searchSession,
  });
  return render(
    <I18nProvider>
      {definition.renderCanvasContent!(
        {
          attachment: makeAttachment(),
        } as unknown as Parameters<NonNullable<typeof definition.renderCanvasContent>>[0],
        {
          closeCanvas: overrides.closeCanvas ?? jest.fn(),
        } as unknown as Parameters<NonNullable<typeof definition.renderCanvasContent>>[1]
      )}
    </I18nProvider>
  );
};

describe('EntityAnalyticsDashboardCanvasContent', () => {
  afterEach(() => {
    delete (global as unknown as Record<string, unknown>)[RESIZE_CALLBACK_KEY];
    (navigateToEntityAnalyticsHomePageInApp as jest.Mock).mockClear();
  });

  it('returns an "Open in Security" action from getActionButtons in canvas mode and forwards searchSession', () => {
    const searchSession = { clear: jest.fn() } as unknown as ISessionService;
    const application = applicationServiceMock.createStartContract();
    const definition = createEntityAnalyticsDashboardAttachmentDefinition({
      application,
      searchSession,
    });

    const buttons = definition.getActionButtons!({
      attachment: makeAttachment(),
      isSidebar: false,
      isCanvas: true,
      updateOrigin: jest.fn(),
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].icon).toBe('popout');
    expect(buttons[0].label).toMatch(/open entity analytics in security/i);

    buttons[0].handler();

    expect(navigateToEntityAnalyticsHomePageInApp).toHaveBeenCalledTimes(1);
    expect(navigateToEntityAnalyticsHomePageInApp).toHaveBeenCalledWith(
      expect.objectContaining({ searchSession })
    );
  });

  it('returns a Preview action from getActionButtons when not in canvas mode', () => {
    const application = applicationServiceMock.createStartContract();
    const openCanvas = jest.fn();
    const definition = createEntityAnalyticsDashboardAttachmentDefinition({ application });

    const buttons = definition.getActionButtons!({
      attachment: makeAttachment(),
      isSidebar: false,
      isCanvas: false,
      openCanvas,
      updateOrigin: jest.fn(),
    });

    expect(buttons).toHaveLength(1);
    expect(buttons[0].icon).toBe('eye');
    expect(buttons[0].label).toMatch(/preview/i);
    buttons[0].handler();
    expect(openCanvas).toHaveBeenCalledTimes(1);
  });

  it('renders the risk breakdown table and the donut chart side-by-side by default', () => {
    renderCanvas();
    const innerRow = screen.getByTestId('riskLevelPanelInnerRow');
    expect(innerRow.getAttribute('data-direction')).toBe('row');
    expect(innerRow.getAttribute('data-align-items')).toBe('center');
    expect(screen.getByTestId('riskLevelBreakdownTableMock')).toBeInTheDocument();
    expect(screen.getByTestId('riskScoreDonutChartMock')).toBeInTheDocument();
  });

  it('stacks the donut chart below the table when the container is narrower than the threshold', () => {
    renderCanvas();
    triggerResize({ width: 400, height: 200 });
    const innerRow = screen.getByTestId('riskLevelPanelInnerRow');
    expect(innerRow.getAttribute('data-direction')).toBe('column');
    expect(innerRow.getAttribute('data-align-items')).toBe('stretch');
  });

  it('returns to the row layout when the container grows past the threshold', () => {
    renderCanvas();
    triggerResize({ width: 400, height: 200 });
    triggerResize({ width: 800, height: 200 });
    const innerRow = screen.getByTestId('riskLevelPanelInnerRow');
    expect(innerRow.getAttribute('data-direction')).toBe('row');
    expect(innerRow.getAttribute('data-align-items')).toBe('center');
  });

  it('treats exactly the threshold width as wide (row layout)', () => {
    renderCanvas();
    triggerResize({ width: 500, height: 200 });
    const innerRow = screen.getByTestId('riskLevelPanelInnerRow');
    expect(innerRow.getAttribute('data-direction')).toBe('row');
  });

  it('sets canvasWidth to 50vw so the dashboard uses the full canvas flyout width', () => {
    const application = applicationServiceMock.createStartContract();
    const definition = createEntityAnalyticsDashboardAttachmentDefinition({ application });
    expect(definition.canvasWidth).toBe('50vw');
  });

  it('forwards closeCanvas from the canvas render callbacks into EntityListTable so per-row navigation can dismiss the canvas overlay', () => {
    const closeCanvas = jest.fn();
    renderCanvas({ closeCanvas });
    expect(screen.getByTestId('entityListTableMock').getAttribute('data-has-close-canvas')).toBe(
      'true'
    );
  });
});
