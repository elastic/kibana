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
  getUnavailableColumnText,
} from './translations';

describe('EntityTableTruncationCallout', () => {
  it('names the returned count and says more match', () => {
    render(<EntityTableTruncationCallout returned={250} />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    expect(callout).toHaveTextContent(getTruncationTitle({ returned: 250 }));
    expect(callout).toHaveTextContent(TRUNCATION_BODY);
  });

  it('separates the thousands in the count', () => {
    render(<EntityTableTruncationCallout returned={2_500} />);

    expect(screen.getByTestId('entityInventoryTruncationCallout')).toHaveTextContent('2,500');
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
