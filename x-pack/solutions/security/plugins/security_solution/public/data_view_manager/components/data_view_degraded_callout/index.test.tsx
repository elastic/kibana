/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { DataViewDegradedCallout } from '.';

describe('DataViewDegradedCallout', () => {
  it('renders the shared title, index pattern, and caller-provided details', () => {
    const dataView = createStubDataView({ spec: { title: 'logs-*' } });

    render(
      <I18nProvider>
        <DataViewDegradedCallout dataView={dataView} data-test-subj="my-degraded-callout">
          {'Custom details.'}
        </DataViewDegradedCallout>
      </I18nProvider>
    );

    expect(screen.getByTestId('my-degraded-callout')).toBeInTheDocument();
    expect(screen.getByText('Some data view fields are unavailable')).toBeInTheDocument();
    expect(screen.getByText('logs-*')).toBeInTheDocument();
    expect(screen.getByText(/Custom details/)).toBeInTheDocument();
  });

  it('omits the index pattern in compact mode', () => {
    const dataView = createStubDataView({ spec: { title: 'logs-*' } });

    render(
      <I18nProvider>
        <DataViewDegradedCallout compact dataView={dataView} data-test-subj="my-degraded-callout">
          {'Custom details.'}
        </DataViewDegradedCallout>
      </I18nProvider>
    );

    expect(screen.getByText('Some data view fields are unavailable')).toBeInTheDocument();
    expect(screen.queryByText('logs-*')).not.toBeInTheDocument();
    expect(screen.getByText(/Custom details/)).toBeInTheDocument();
  });
});
