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
    });
  });
});
