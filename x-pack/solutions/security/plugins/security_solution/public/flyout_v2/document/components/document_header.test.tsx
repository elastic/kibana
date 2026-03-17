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
import { DocumentHeader } from './document_header';
import { HEADER_TITLE_TEST_ID } from './test_ids';
import { TITLE_HEADER_TEXT_TEST_ID } from '../../shared/components/test_ids';

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
});

const renderDocumentHeader = (props: Parameters<typeof DocumentHeader>[0]) =>
  render(
    <IntlProvider locale="en">
      <DocumentHeader {...props} />
    </IntlProvider>
  );

describe('<DocumentHeader />', () => {
  it('should render the header title', () => {
    const { getByTestId } = renderDocumentHeader({ hit: alertHit });

    expect(getByTestId(TITLE_HEADER_TEXT_TEST_ID(HEADER_TITLE_TEST_ID))).toHaveTextContent(
      'Test Rule'
    );
  });

  it('should pass titleHref to the header title', () => {
    const { getByTestId } = renderDocumentHeader({
      hit: alertHit,
      titleHref: 'https://example.com/rule/123',
    });

    expect(getByTestId(`${HEADER_TITLE_TEST_ID}LinkIcon`)).toBeInTheDocument();
  });
});
