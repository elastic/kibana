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
import { Title } from './title';
import { TITLE_LINK_TEST_ID, TITLE_TEST_ID } from './test_ids';

jest.mock('../../shared/components/flyout_title', () => ({
  FlyoutTitle: ({
    title,
    iconType,
    isLink = false,
    'data-test-subj': dataTestSubj,
  }: {
    title: string;
    iconType?: string;
    isLink?: boolean;
    'data-test-subj'?: string;
  }) => (
    <div
      data-test-subj={dataTestSubj}
      data-title={title}
      data-icon-type={iconType ?? ''}
      data-is-link={String(isLink)}
    >
      {title}
    </div>
  ),
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

const externalAlertHit = createMockHit({
  'event.kind': 'alert',
});

const renderTitle = (props: Parameters<typeof Title>[0]) =>
  render(
    <IntlProvider locale="en">
      <Title {...props} />
    </IntlProvider>
  );

describe('<Title />', () => {
  it('should render alert title with warning icon', () => {
    const { getByTestId } = renderTitle({ hit: alertHit });

    expect(getByTestId(TITLE_TEST_ID)).toHaveTextContent('Test Rule Name');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'warning');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-is-link', 'false');
  });

  it('should render default title when alert has no rule name', () => {
    const { getByTestId } = renderTitle({ hit: alertHitWithoutRuleName });

    expect(getByTestId(TITLE_TEST_ID)).toHaveTextContent('Document details');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'warning');
  });

  it('should render event title with analyzeEvent icon', () => {
    const { getByTestId } = renderTitle({ hit: eventHit });

    expect(getByTestId(TITLE_TEST_ID)).toHaveTextContent('test-process');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'analyzeEvent');
  });

  it('should render default event title when event has no category', () => {
    const { getByTestId } = renderTitle({ hit: eventHitWithoutCategory });

    expect(getByTestId(TITLE_TEST_ID)).toHaveTextContent('Event details');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'analyzeEvent');
  });

  it('should render external alerts with the external alert title and analyzeEvent icon', () => {
    const { getByTestId } = renderTitle({ hit: externalAlertHit });

    expect(getByTestId(TITLE_TEST_ID)).toHaveTextContent('External alert details');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'analyzeEvent');
  });

  it('should render as a link when titleHref is provided', () => {
    const { getByTestId } = renderTitle({
      hit: alertHit,
      titleHref: 'https://example.com/rule/123',
    });

    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveAttribute('href', 'https://example.com/rule/123');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-is-link', 'true');
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-icon-type', 'warning');
  });

  it('should render as plain text when titleHref is not provided', () => {
    const { queryByTestId, getByTestId } = renderTitle({ hit: alertHit });

    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_TEST_ID)).toHaveAttribute('data-is-link', 'false');
  });
});
