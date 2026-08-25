/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../../../common/mock';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertFieldBadge } from '.';

const contextId = 'test';
const eventId = 'abcd';
const field = 'destination.ip';
const value = '127.0.0.1';

describe('AlertFieldBadge', () => {
  test('it renders the expected value', () => {
    render(
      <TestProviders>
        <AlertFieldBadge
          contextId={contextId}
          eventId={eventId}
          field={field}
          showSeparator={false}
          scopeId={TableId.alertsOnAlertsPage}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('alertFieldBadge')).toHaveTextContent('127.0.0.1');
  });

  test('it does NOT render a separator when `showSeparator` is false', () => {
    const showSeparator = false;

    render(
      <TestProviders>
        <AlertFieldBadge
          contextId={contextId}
          eventId={eventId}
          field={field}
          showSeparator={showSeparator}
          scopeId={TableId.alertsOnAlertsPage}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('separator')).not.toBeInTheDocument();
  });

  test('it renders the expected value with a separator when `showSeparator` is true', () => {
    const showSeparator = true;

    render(
      <TestProviders>
        <AlertFieldBadge
          contextId={contextId}
          eventId={eventId}
          field={field}
          showSeparator={showSeparator}
          scopeId={TableId.alertsOnAlertsPage}
          value={value}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('alertFieldBadge')).toHaveTextContent('127.0.0.1,');
  });
});
