/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { useFlyoutApi } from '../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { ABOUT_SECTION_TEST_ID, AboutSection } from './about_section';
import { ABOUT_SECTION_TITLE } from '../../../shared/constants/flyout_titles';

vi.mock('../../../use_flyout_api');

// Capture the `onShowRuleSummary` prop passed to AlertDescription so the test can invoke it.
let capturedOnShowRuleSummary: (() => void) | undefined;
vi.mock('./alert_description', () => {
      const mocked = {
      AlertDescription: ({ onShowRuleSummary }: { onShowRuleSummary?: () => void }) => {
        capturedOnShowRuleSummary = onShowRuleSummary;
        return <div>{'AlertDescription'}</div>;
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./alert_reason', () => {
      const mocked = {
      AlertReason: () => <div>{'AlertReason'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./alert_status', () => {
      const mocked = {
      AlertStatus: () => <div>{'AlertStatus'}</div>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./mitre_attack', () => {
      const mocked = {
      MitreAttack: () => <div>{'MitreAttack'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./event_category_description', () => {
      const mocked = {
      EventCategoryDescription: () => <div>{'EventCategoryDescription'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./event_kind_description', () => {
      const mocked = {
      EventKindDescription: () => <div>{'EventKindDescription'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./event_renderer', () => {
      const mocked = {
      EventRenderer: () => <div>{'EventRenderer'}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../shared/hooks/use_expand_section', () => {
      const mocked = {
      useExpandSection: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.uuid': 'rule-uuid-123',
  'kibana.alert.rule.name': 'My Rule',
});

describe('AboutSection', () => {
  const mockUseExpandSection = vi.mocked(useExpandSection);
  const flyoutApi = createFlyoutApiMock();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnShowRuleSummary = undefined;
    vi.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('renders the About expandable section', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <AboutSection hit={alertHit} />
      </IntlProvider>
    );

    expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Header`)).toHaveTextContent(ABOUT_SECTION_TITLE);
  });

  it('renders the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <AboutSection hit={alertHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Content`)).not.toBeVisible();
    });
  });

  it('renders the component expanded if value is true in local storage', async () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId, getByText } = render(
      <IntlProvider locale="en">
        <AboutSection hit={alertHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByTestId(`${ABOUT_SECTION_TEST_ID}Content`)).toBeVisible();
      expect(getByText('AlertDescription')).toBeInTheDocument();
      expect(getByText('AlertReason')).toBeInTheDocument();
      expect(getByText('AlertStatus')).toBeInTheDocument();
      expect(getByText('MitreAttack')).toBeInTheDocument();
    });
  });

  it('opens the rule flyout with the alert rule id when onShowRuleSummary is invoked', () => {
    mockUseExpandSection.mockReturnValue(true);

    render(
      <IntlProvider locale="en">
        <AboutSection hit={alertHit} />
      </IntlProvider>
    );

    expect(capturedOnShowRuleSummary).toBeDefined();

    act(() => {
      capturedOnShowRuleSummary?.();
    });

    expect(flyoutApi.openRuleFlyout).toHaveBeenCalledTimes(1);
    expect(flyoutApi.openRuleFlyout).toHaveBeenCalledWith({
      ruleId: 'rule-uuid-123',
      origin: FLYOUT_ORIGIN.ABOUT_SECTION,
      title: 'Rule: My Rule',
    });
  });

  it('renders EventCategoryDescription and EventRenderer for event.kind === event', async () => {
    mockUseExpandSection.mockReturnValue(true);
    const eventHit = createMockHit({ 'event.kind': 'event' });

    const { getByText } = render(
      <IntlProvider locale="en">
        <AboutSection hit={eventHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByText('EventCategoryDescription')).toBeInTheDocument();
      expect(getByText('EventRenderer')).toBeInTheDocument();
    });
  });

  it('renders EventKindDescription and EventRenderer for a non-event ECS-valid event.kind', async () => {
    mockUseExpandSection.mockReturnValue(true);
    const metricHit = createMockHit({ 'event.kind': 'metric' });

    const { getByText } = render(
      <IntlProvider locale="en">
        <AboutSection hit={metricHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByText('EventKindDescription')).toBeInTheDocument();
      expect(getByText('EventRenderer')).toBeInTheDocument();
    });
  });

  it('renders only EventRenderer for a non-ECS event.kind', async () => {
    mockUseExpandSection.mockReturnValue(true);
    const unknownKindHit = createMockHit({ 'event.kind': 'custom-non-ecs-kind' });

    const { getByText, queryByText } = render(
      <IntlProvider locale="en">
        <AboutSection hit={unknownKindHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByText('EventRenderer')).toBeInTheDocument();
      expect(queryByText('EventCategoryDescription')).not.toBeInTheDocument();
      expect(queryByText('EventKindDescription')).not.toBeInTheDocument();
    });
  });

  it('renders only EventRenderer when event.kind is not set', async () => {
    mockUseExpandSection.mockReturnValue(true);
    const noKindHit = createMockHit({});

    const { getByText, queryByText } = render(
      <IntlProvider locale="en">
        <AboutSection hit={noKindHit} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByText('EventRenderer')).toBeInTheDocument();
      expect(queryByText('EventCategoryDescription')).not.toBeInTheDocument();
      expect(queryByText('EventKindDescription')).not.toBeInTheDocument();
    });
  });
});
