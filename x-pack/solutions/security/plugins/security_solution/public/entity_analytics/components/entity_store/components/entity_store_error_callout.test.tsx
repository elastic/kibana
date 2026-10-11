/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EngineDescriptor } from '@kbn/entity-store/common';
import { EntityStoreErrorCallout } from './entity_store_error_callout';
import { TestProviders } from '../../../../common/mock';

const engine: EngineDescriptor = {
  type: 'user',
  indexPattern: '',
  status: 'started',
  fieldHistoryLength: 10,
};

const nonPriority: NonNullable<EngineDescriptor['nonPriority']> = {
  status: 'started',
  error: null,
  samplingRate: null,
};

describe('EntityStoreErrorCallout', () => {
  it('renders nothing without an error', () => {
    const { container } = render(
      <EntityStoreErrorCallout engine={{ ...engine, error: null, nonPriority }} />,
      { wrapper: TestProviders }
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a title for log extraction errors', () => {
    render(
      <EntityStoreErrorCallout
        engine={{ ...engine, error: { action: 'extractLogs', message: 'priority failed' } }}
      />,
      { wrapper: TestProviders }
    );
    expect(screen.getByText('An error occurred during user log extraction')).toBeInTheDocument();
    expect(screen.getByText('priority failed')).toBeInTheDocument();
  });

  it('renders a non-priority extraction error', () => {
    render(
      <EntityStoreErrorCallout
        engine={{
          ...engine,
          error: null,
          nonPriority: {
            ...nonPriority,
            status: 'error',
            error: { action: 'extractLogs', message: 'non-priority failed' },
          },
        }}
      />,
      { wrapper: TestProviders }
    );
    expect(
      screen.getByText('An error occurred during user non-priority log extraction')
    ).toBeInTheDocument();
    expect(screen.getByText('non-priority failed')).toBeInTheDocument();
  });

  it('renders both errors when both processes failed', () => {
    render(
      <EntityStoreErrorCallout
        engine={{
          ...engine,
          error: { action: 'extractLogs', message: 'priority failed' },
          nonPriority: {
            ...nonPriority,
            error: { action: 'extractLogs', message: 'non-priority failed' },
          },
        }}
      />,
      { wrapper: TestProviders }
    );
    expect(screen.getByText('priority failed')).toBeInTheDocument();
    expect(screen.getByText('non-priority failed')).toBeInTheDocument();
  });
});
