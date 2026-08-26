/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { EventHeaderTitle } from './event_header_title';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { TestProvidersComponent } from '../../../../common/mock';
import {
  EVENT_TITLE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
} from '../../../../flyout_v2/document/main/components/test_ids';

jest.mock('../../../../common/lib/kibana');

moment.suppressDeprecationWarnings = true;
moment.tz.setDefault('UTC');

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

const renderHeader = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProvidersComponent>
      <DocumentDetailsContext.Provider value={contextValue}>
        <EventHeaderTitle />
      </DocumentDetailsContext.Provider>
    </TestProvidersComponent>
  );

const EVENT_HEADER_TEXT_TEST_ID = `${EVENT_TITLE_TEST_ID}Text`;
const createSearchHit = (fields: Record<string, unknown[]>) => ({
  ...mockSearchHit,
  fields: {
    ...mockSearchHit.fields,
    ...fields,
  },
});

describe('<EventHeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
  });

  it('should render component', () => {
    const { getByTestId, getByText } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': ['event'],
        'event.category': ['process'],
        'process.name': ['process name'],
        'event.severity': [3],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();
    expect(getByText('Jan 1, 2020 @ 00:00:00.000')).toBeInTheDocument();
  });

  it('should render corret title if event.kind is alert', () => {
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': ['alert'],
        'event.category': ['malware'],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('External alert details');
  });

  it('should render corret title if event.kind is not alert or event', () => {
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': ['metric'],
        'event.category': ['malware'],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Metric details');
  });

  it('should render event category as title if event.kind is event', () => {
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': ['event'],
        'event.category': ['process'],
        'process.name': ['process name'],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('process name');
  });

  it('should render default title if event.kind is event and event category is not available', () => {
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': ['event'],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Event details');
  });

  it('should fallback title if event kind is null', () => {
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      searchHit: createSearchHit({
        'event.kind': [''],
      }),
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Event details');
  });
});
