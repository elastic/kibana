/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render } from '@testing-library/react';
import React from 'react';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { ABOUT_SECTION_TEST_ID, ABOUT_SECTION_TITLE, AboutSection } from './about_section';

jest.mock('./alert_description', () => ({
  AlertDescription: () => <div>{'AlertDescription'}</div>,
}));

jest.mock('./alert_reason', () => ({
  AlertReason: () => <div>{'AlertReason'}</div>,
}));

jest.mock('./alert_status', () => ({
  AlertStatus: () => <div>{'AlertStatus'}</div>,
}));
jest.mock('./mitre_attack', () => ({
  MitreAttack: () => <div>{'MitreAttack'}</div>,
}));

jest.mock('./event_category_description', () => ({
  EventCategoryDescription: () => <div>{'EventCategoryDescription'}</div>,
}));

jest.mock('./event_kind_description', () => ({
  EventKindDescription: () => <div>{'EventKindDescription'}</div>,
}));

jest.mock('./event_renderer', () => ({
  EventRenderer: () => <div>{'EventRenderer'}</div>,
}));

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
});

describe('AboutSection', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);

  beforeEach(() => {
    jest.clearAllMocks();
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
