/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { SEVERITY_VALUE_TEST_ID, FLYOUT_EVENT_HEADER_TITLE_TEST_ID } from './test_ids';
import { EventHeaderTitle } from './event_header_title';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { TestProvidersComponent } from '../../../../common/mock';

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

const EVENT_HEADER_TEXT_TEST_ID = `${FLYOUT_EVENT_HEADER_TITLE_TEST_ID}Text`;

describe('<EventHeaderTitle />', () => {
  beforeEach(() => {
    jest.mocked(useDateFormat).mockImplementation(() => dateFormat);
    jest.mocked(useTimeZone).mockImplementation(() => 'UTC');
  });

  it('should render component', () => {
    const { getByTestId } = renderHeader(mockContextValue);

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SEVERITY_VALUE_TEST_ID)).toBeInTheDocument();
  });

  it('should render corret title if event.kind is alert', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'alert';
        case 'event.category':
          return 'malware';
      }
    };
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('External alert details');
  });

  it('should render corret title if event.kind is not alert or event', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'metric';
        case 'event.category':
          return 'malware';
      }
    };
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Metric details');
  });

  it('should render event category as title if event.kind is event', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
        case 'event.category':
          return 'process';
        case 'process.name':
          return 'process name';
      }
    };
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('process name');
  });

  it('should render default title if event.kind is event and event category is not available', () => {
    const mockGetFieldsData = (field: string) => {
      switch (field) {
        case 'event.kind':
          return 'event';
      }
    };
    const { getByTestId } = renderHeader({
      ...mockContextValue,
      getFieldsData: mockGetFieldsData,
    });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Event details');
  });

  it('should fallback title if event kind is null', () => {
    const { getByTestId } = renderHeader({ ...mockContextValue, getFieldsData: () => '' });

    expect(getByTestId(EVENT_HEADER_TEXT_TEST_ID)).toHaveTextContent('Event details');
  });
});
