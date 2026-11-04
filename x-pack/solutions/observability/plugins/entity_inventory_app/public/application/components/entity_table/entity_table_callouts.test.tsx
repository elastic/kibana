/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import {
  EntityTableDiagnosticsCallout,
  EntityTableTruncationCallout,
} from './entity_table_callouts';
import {
  DIAGNOSTICS_TITLE,
  TRUNCATION_BODY,
  getSourceErrorText,
  getTruncationTitle,
  getTruncationTotalUnknownTitle,
  getUnavailableColumnText,
} from './translations';

describe('EntityTableTruncationCallout', () => {
  it('names the returned count and the total', () => {
    render(<EntityTableTruncationCallout returned={250} total={12_345} />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    expect(callout).toHaveTextContent(getTruncationTitle({ returned: 250, total: 12_345 }));
    expect(callout).toHaveTextContent(TRUNCATION_BODY);
  });

  it('separates the thousands in the counts', () => {
    render(<EntityTableTruncationCallout returned={2_500} total={12_345} />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    expect(callout).toHaveTextContent('2,500');
    expect(callout).toHaveTextContent('12,345');
  });

  it('separates the thousands in the count when the total is unknown', () => {
    render(<EntityTableTruncationCallout returned={2_500} total={null} />);

    expect(screen.getByTestId('entityInventoryTruncationCallout')).toHaveTextContent('2,500');
  });

  it('says the total is unknown when the count failed', () => {
    render(<EntityTableTruncationCallout returned={250} total={null} />);

    expect(screen.getByTestId('entityInventoryTruncationCallout')).toHaveTextContent(
      getTruncationTotalUnknownTitle({ returned: 250 })
    );
  });
});

describe('EntityTableDiagnosticsCallout', () => {
  const errors = [
    { indexPattern: 'metrics-system.*-*', status: 403, reason: 'security_exception' },
    { indexPattern: 'metrics-otel-*', status: null, reason: 'timeout' },
  ];
  const unavailableColumns = [
    { indexPattern: 'metrics-otel-*', column: 'k8s.cluster.name', field: 'k8s.cluster.name' },
  ];

  it('lists every source error and unavailable column', () => {
    render(
      <EntityTableDiagnosticsCallout errors={errors} unavailableColumns={unavailableColumns} />
    );

    const callout = screen.getByTestId('entityInventoryDiagnosticsCallout');
    expect(callout).toHaveTextContent(DIAGNOSTICS_TITLE);
    const items = within(callout)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(items).toEqual([
      getSourceErrorText(errors[0]),
      getSourceErrorText(errors[1]),
      getUnavailableColumnText(unavailableColumns[0]),
    ]);
  });

  it('renders nothing without errors or unavailable columns', () => {
    const { container } = render(
      <EntityTableDiagnosticsCallout errors={[]} unavailableColumns={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
