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
import { HeaderTitle } from './header_title';
import { HEADER_TITLE_TEST_ID, HEADER_TITLE_LINK_TEST_ID } from './test_ids';
import {
  TITLE_HEADER_ICON_TEST_ID,
  TITLE_HEADER_TEXT_TEST_ID,
  TITLE_LINK_ICON_TEST_ID,
} from '../../shared/components/test_ids';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.rule.name': 'Test Rule Name',
  'kibana.alert.rule.uuid': 'rule-uuid-123',
});

const alertHitWithoutRuleName = createMockHit({
  'event.kind': 'signal',
});

const eventHit = createMockHit({
  'event.kind': 'event',
  'event.category': 'process',
  'process.name': 'test-process',
});

const eventHitWithoutCategory = createMockHit({
  'event.kind': 'event',
});

const renderHeaderTitle = (props: Parameters<typeof HeaderTitle>[0]) =>
  render(
    <IntlProvider locale="en">
      <HeaderTitle {...props} />
    </IntlProvider>
  );

describe('<HeaderTitle />', () => {
  it('should render alert title with warning icon', () => {
    const { getByTestId } = renderHeaderTitle({ hit: alertHit });

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toHaveTextContent(
      'Test Rule Name'
    );
    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(HEADER_TITLE_TEST_ID))).toBeInTheDocument();
  });

  it('should render default title when alert has no rule name', () => {
    const { getByTestId } = renderHeaderTitle({ hit: alertHitWithoutRuleName });

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toHaveTextContent(
      'Document details'
    );
  });

  it('should render event title with analyzeEvent icon', () => {
    const { getByTestId } = renderHeaderTitle({ hit: eventHit });

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toHaveTextContent(
      'test-process'
    );
    expect(getByTestId(TITLE_HEADER_ICON_TEST_ID(HEADER_TITLE_TEST_ID))).toBeInTheDocument();
  });

  it('should render default event title when event has no category', () => {
    const { getByTestId } = renderHeaderTitle({ hit: eventHitWithoutCategory });

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toHaveTextContent(
      'Event details'
    );
  });

  it('should render as a link when titleHref is provided', () => {
    const { getByTestId } = renderHeaderTitle({
      hit: alertHit,
      titleHref: 'https://example.com/rule/123',
    });

    expect(getByTestId(HEADER_TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_TITLE_LINK_TEST_ID)).toHaveAttribute(
      'href',
      'https://example.com/rule/123'
    );
    expect(getByTestId(TITLE_LINK_ICON_TEST_ID(HEADER_TITLE_TEST_ID))).toBeInTheDocument();
  });

  it('should render as plain text when titleHref is not provided', () => {
    const { queryByTestId, getByTestId } = renderHeaderTitle({ hit: alertHit });

    expect(queryByTestId(HEADER_TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toBeInTheDocument();
  });
});
