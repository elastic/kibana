/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import React from 'react';
import { useDefaultAIConnectorId } from '../../../common/hooks/use_default_ai_connector_id';
import { AiSummary } from './ai_summary';

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: { management: { kibana: { settings: true } } },
      },
    },
  }),
}));

jest.mock('../../../common/hooks/use_default_ai_connector_id', () => ({
  useDefaultAIConnectorId: jest.fn(),
}));

jest.mock('./alert_summary', () => ({
  AlertSummary: ({ alertId }: { alertId: string }) => (
    <div data-test-subj="alertSummary">{alertId}</div>
  ),
}));

const createMockHit = (raw: DataTableRecord['raw'], flattened: DataTableRecord['flattened']) =>
  ({
    id: '1',
    raw,
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('AiSummary', () => {
  const mockSetHasAlertSummary = jest.fn();
  const mockUseDefaultAIConnectorId = jest.mocked(useDefaultAIConnectorId);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a skeleton while loading the connector', () => {
    mockUseDefaultAIConnectorId.mockReturnValue({
      defaultConnectorId: undefined,
      isLoading: true,
    });

    const { queryByTestId } = render(
      <IntlProvider locale="en">
        <AiSummary
          hit={createMockHit({ _id: 'raw-id' }, { 'event.kind': 'signal' })}
          setHasAlertSummary={mockSetHasAlertSummary}
        />
      </IntlProvider>
    );

    expect(queryByTestId('alertSummary')).not.toBeInTheDocument();
  });

  it('renders AlertSummary with eventId when provided', () => {
    mockUseDefaultAIConnectorId.mockReturnValue({
      defaultConnectorId: 'connector-1',
      isLoading: false,
    });

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <AiSummary
          eventId="event-id"
          hit={createMockHit({ _id: 'raw-id' }, { 'event.kind': 'signal' })}
          setHasAlertSummary={mockSetHasAlertSummary}
        />
      </IntlProvider>
    );

    expect(getByTestId('alertSummary')).toHaveTextContent('event-id');
  });
});
