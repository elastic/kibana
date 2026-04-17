/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TestProviders } from '../../../common/mock';
import { REASON_DETAILS_PREVIEW_BUTTON_TEST_ID, REASON_TITLE_TEST_ID } from './test_ids';
import { AlertReason } from './alert_reason';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.reason': 'Alert reason value',
});

const documentHit = createMockHit({
  'event.kind': 'event',
});

const renderAlertReason = (props: Partial<Parameters<typeof AlertReason>[0]> = {}) =>
  render(
    <TestProviders>
      <IntlProvider locale="en">
        <AlertReason hit={alertHit} {...props} />
      </IntlProvider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = "There's no source event information for this alert.";

describe('<AlertReason />', () => {
  it('should render the component for alert', () => {
    const onShowFullReason = jest.fn();
    const { getByTestId } = renderAlertReason({ onShowFullReason });

    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_TITLE_TEST_ID)).toHaveTextContent('Alert reason');
    expect(getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).toHaveTextContent(
      'Show full reason'
    );
  });

  it('should hide preview button if callback is not provided', () => {
    const { queryByTestId } = renderAlertReason();

    expect(queryByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the component for document', () => {
    const { getByTestId, queryByTestId } = renderAlertReason({ hit: documentHit });

    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_TITLE_TEST_ID)).toHaveTextContent('Document reason');
    expect(queryByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render no reason if the field is null', () => {
    const { getByText, getByTestId } = renderAlertReason({
      hit: createMockHit({
        'event.kind': 'signal',
      }),
      onShowFullReason: jest.fn(),
    });

    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).toBeDisabled();
  });

  it('should call callback when clicking on button', () => {
    const onShowFullReason = jest.fn();
    const { getByTestId } = renderAlertReason({ onShowFullReason });

    getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID).click();

    expect(onShowFullReason).toHaveBeenCalledTimes(1);
  });
});
