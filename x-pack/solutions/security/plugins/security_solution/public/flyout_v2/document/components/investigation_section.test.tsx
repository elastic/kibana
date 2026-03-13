/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import {
  INVESTIGATION_SECTION_TEST_ID,
  INVESTIGATION_SECTION_TITLE,
  InvestigationSection,
} from './investigation_section';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./investigation_guide', () => ({
  InvestigationGuide: () => <div data-test-subj="investigationGuideMock" />,
}));

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockHit = createMockHit({
  'event.kind': 'signal',
});

const nonSignalMockHit = createMockHit({
  'event.kind': 'event',
});

describe('InvestigationSection', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseKibana = jest.mocked(useKibana);
  const store = createStore(() => ({}));
  const history = createMemoryHistory();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        overlays: {
          openSystemFlyout: jest.fn(),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('renders the Investigation expandable section', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InvestigationSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    expect(getByTestId(`${INVESTIGATION_SECTION_TEST_ID}Header`)).toHaveTextContent(
      INVESTIGATION_SECTION_TITLE
    );
  });

  it('renders the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InvestigationSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    await act(async () => {
      expect(getByTestId(`${INVESTIGATION_SECTION_TEST_ID}Content`)).not.toBeVisible();
    });
  });

  it('renders the component expanded if value is true in local storage', async () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InvestigationSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    await act(async () => {
      expect(getByTestId(`${INVESTIGATION_SECTION_TEST_ID}Content`)).toBeVisible();
    });
  });

  it('renders investigation guide when document is signal', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InvestigationSection hit={mockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    expect(getByTestId('investigationGuideMock')).toBeInTheDocument();
  });

  it('does not render investigation guide when document is not signal', () => {
    mockUseExpandSection.mockReturnValue(true);

    const { queryByTestId } = render(
      <IntlProvider locale="en">
        <Provider store={store}>
          <Router history={history}>
            <InvestigationSection hit={nonSignalMockHit} />
          </Router>
        </Provider>
      </IntlProvider>
    );

    expect(queryByTestId('investigationGuideMock')).not.toBeInTheDocument();
  });
});
