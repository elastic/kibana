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
import { Header } from './header';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: jest.fn().mockReturnValue('https://example.com/rule/test-rule-id'),
      },
    },
  }),
}));

jest.mock('./components/header_title', () => ({
  HeaderTitle: ({ hit, titleHref }: { hit: DataTableRecord; titleHref?: string }) => (
    <div
      data-test-subj="mockHeaderTitle"
      data-hit-id={hit.id}
      data-event-kind={String(hit.flattened['event.kind'] ?? '')}
      data-title-href={titleHref ?? ''}
    />
  ),
}));

jest.mock('./components/severity', () => ({
  DocumentSeverity: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockDocumentSeverity" data-hit-id={hit.id} />
  ),
}));

jest.mock('../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => (
    <div data-test-subj="mockPreferenceFormattedDate">{value.toISOString()}</div>
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
  'kibana.alert.rule.name': 'Test Rule',
  'kibana.alert.rule.uuid': 'test-rule-id',
  '@timestamp': '2023-01-01T00:00:00.000Z',
});

const eventHit = createMockHit({
  'event.kind': 'event',
});

const renderHeader = (props: Parameters<typeof Header>[0]) =>
  render(
    <IntlProvider locale="en">
      <Header {...props} />
    </IntlProvider>
  );

describe('<DocumentHeader />', () => {
  it('should pass the hit to the severity component', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockDocumentSeverity')).toHaveAttribute('data-hit-id', '1');
  });

  it('should render the inline timestamp when present', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockPreferenceFormattedDate')).toHaveTextContent(
      '2023-01-01T00:00:00.000Z'
    );
  });

  it('should pass the hit to the header title', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-hit-id', '1');
    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-event-kind', 'signal');
  });

  it('should resolve and pass titleHref for alerts with a rule id', () => {
    const { getByTestId } = renderHeader({ hit: alertHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute(
      'data-title-href',
      'https://example.com/rule/test-rule-id'
    );
  });

  it('should not pass titleHref when there is no rule id', () => {
    const { getByTestId } = renderHeader({ hit: eventHit });

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-title-href', '');
  });
});
