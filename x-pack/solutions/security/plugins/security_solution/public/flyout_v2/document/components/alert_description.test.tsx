/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AlertDescription } from './alert_description';
import {
  ALERT_DESCRIPTION_DETAILS_TEST_ID,
  ALERT_DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHitWithDescription = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.uuid': '123',
  'kibana.alert.rule.description':
    'This is a very long description of the rule. In theory. this description is long enough that it should be cut off when displayed in collapsed mode.',
});

const alertHitWithoutDescription = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.uuid': '123',
});

const documentHit = createMockHit({
  'event.kind': 'event',
  'some.other.field': 'value',
});

const renderDescription = (props: Parameters<typeof AlertDescription>[0]) =>
  render(
    <IntlProvider locale="en">
      <AlertDescription {...props} />
    </IntlProvider>
  );

const NO_DATA_MESSAGE = "There's no description for this rule.";

describe('<AlertDescription />', () => {
  it('should render rule title and description when hit is an alert with description', () => {
    const { getByTestId } = renderDescription({ hit: alertHitWithDescription });

    expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent('Rule description');
    expect(getByTestId(ALERT_DESCRIPTION_DETAILS_TEST_ID)).toHaveTextContent(
      alertHitWithDescription.flattened['kibana.alert.rule.description'] as string
    );
  });

  it('should render rule summary button when onShowRuleSummary is provided', () => {
    const onShowRuleSummary = jest.fn();
    const { getByTestId } = renderDescription({
      hit: alertHitWithDescription,
      onShowRuleSummary,
    });

    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toHaveTextContent('Show rule summary');
  });

  it('should call onShowRuleSummary when rule summary button is clicked', () => {
    const onShowRuleSummary = jest.fn();
    const { getByTestId } = renderDescription({
      hit: alertHitWithDescription,
      onShowRuleSummary,
    });

    getByTestId(RULE_SUMMARY_BUTTON_TEST_ID).click();

    expect(onShowRuleSummary).toHaveBeenCalledTimes(1);
  });

  it('should render rule summary button as disabled when ruleSummaryDisabled is true', () => {
    const { getByTestId } = renderDescription({
      hit: alertHitWithDescription,
      onShowRuleSummary: jest.fn(),
      ruleSummaryDisabled: true,
    });

    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).toHaveAttribute('disabled');
  });

  it('should not render rule summary button when onShowRuleSummary is not provided', () => {
    const { queryByTestId } = renderDescription({ hit: alertHitWithDescription });

    expect(queryByTestId(RULE_SUMMARY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render no data message when rule description is not available', () => {
    const { getByTestId, getByText } = renderDescription({ hit: alertHitWithoutDescription });

    expect(getByTestId(ALERT_DESCRIPTION_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should render document title and dash when hit is not an alert', () => {
    const { getByTestId } = renderDescription({ hit: documentHit });

    expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ALERT_DESCRIPTION_TITLE_TEST_ID)).toHaveTextContent('Document description');
    expect(getByTestId(ALERT_DESCRIPTION_DETAILS_TEST_ID)).toHaveTextContent('-');
  });

  it('should render no data message when rule description is empty string', () => {
    const hitWithEmptyDescription = createMockHit({
      'event.kind': 'signal',
      'kibana.alert.rule.uuid': '123',
      'kibana.alert.rule.description': '',
    });
    const { getByText } = renderDescription({ hit: hitWithEmptyDescription });

    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
