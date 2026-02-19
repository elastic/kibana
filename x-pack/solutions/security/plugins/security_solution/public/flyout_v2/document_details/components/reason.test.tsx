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
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { Reason } from './reason';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHitWithReason = createMockHit({
  'kibana.alert.rule.uuid': '123',
  [ALERT_REASON]: 'query: process.name:"malware.exe"',
});

const alertHitWithoutReason = createMockHit({
  'kibana.alert.rule.uuid': '123',
});

const documentHit = createMockHit({
  'some.other.field': 'value',
});

const renderReason = (props: Parameters<typeof Reason>[0]) =>
  render(
    <IntlProvider locale="en">
      <Reason {...props} />
    </IntlProvider>
  );

const NO_DATA_MESSAGE = "There's no source event information for this alert.";

describe('<Reason />', () => {
  it('renders alert reason and the preview button when callback is provided', () => {
    const { getByTestId } = renderReason({
      hit: alertHitWithReason,
      onShowFullReason: jest.fn(),
    });
    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_TITLE_TEST_ID)).toHaveTextContent('Alert reason');
    expect(getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).toHaveTextContent(
      'Show full reason'
    );
  });

  it('renders document title and dash when hit is not an alert', () => {
    const { getByTestId } = renderReason({ hit: documentHit });
    expect(getByTestId(REASON_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(REASON_TITLE_TEST_ID)).toHaveTextContent('Document reason');
    expect(getByTestId(REASON_DETAILS_TEST_ID)).toHaveTextContent('-');
  });

  it('renders no reason message when alert reason is missing', () => {
    const { getByText } = renderReason({ hit: alertHitWithoutReason });

    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('calls onShowFullReason when preview button is clicked', () => {
    const onShowFullReason = jest.fn();
    const { getByTestId } = renderReason({
      hit: alertHitWithReason,
      onShowFullReason,
    });

    getByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID).click();

    expect(onShowFullReason).toHaveBeenCalledTimes(1);
  });

  it('does not render preview button when onShowFullReason is not provided', () => {
    const { queryByTestId } = renderReason({ hit: alertHitWithReason });

    expect(queryByTestId(REASON_DETAILS_PREVIEW_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
