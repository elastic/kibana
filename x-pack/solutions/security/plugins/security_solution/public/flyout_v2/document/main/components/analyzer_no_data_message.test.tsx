/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AnalyzerPreviewNoDataMessage } from './analyzer_no_data_message';

const renderNoDataMessage = () =>
  render(
    <IntlProvider locale="en">
      <AnalyzerPreviewNoDataMessage />
    </IntlProvider>
  );

describe('<AnalyzerPreviewNoDataMessage />', () => {
  it('renders the no-data description with integration names', () => {
    const { getByText } = renderNoDataMessage();

    expect(
      getByText(/You can only visualize events triggered by hosts configured/i)
    ).toBeInTheDocument();
    expect(getByText('sysmon')).toBeInTheDocument();
    expect(getByText('winlogbeat')).toBeInTheDocument();
  });

  it('renders the documentation link with expected destination', () => {
    const { getByRole } = renderNoDataMessage();
    const link = getByRole('link', { name: /Visual event analyzer/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });
});
