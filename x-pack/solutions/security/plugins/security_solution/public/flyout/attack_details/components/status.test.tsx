/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Status } from './status';
import { TestProviders } from '../../../common/mock';
import { HEADER_STATUS_BLOCK_TEST_ID } from '../constants/test_ids';
import { useAttackDetailsContext } from '../context';
import { getEnrichedFieldInfo } from '../../document_details/right/utils/enriched_field_info';

jest.mock('../context');

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('./status_popover_button', () => ({
  StatusPopoverButton: ({ enrichedFieldInfo }: { enrichedFieldInfo: unknown }) => (
    <div data-test-subj="status-popover">{JSON.stringify(enrichedFieldInfo)}</div>
  ),
}));

jest.mock('../../../common/components/empty_value', () => ({
  getEmptyTagValue: jest.fn(() => <div data-test-subj="empty-tag">{'-'}</div>),
}));

jest.mock('../../document_details/right/utils/enriched_field_info', () => ({
  getEnrichedFieldInfo: jest.fn(),
}));

describe('<Status />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders empty tag when status data is not available', () => {
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: 'attack-id',
      browserFields: {},
      dataFormattedForFieldBrowser: [],
    });

    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_STATUS_BLOCK_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('empty-tag')).toBeInTheDocument();
  });

  test('renders empty tag in preview mode', () => {
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: 'attack-id',
      browserFields: {},
      dataFormattedForFieldBrowser: [{}],
      isPreview: true,
    });

    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );

    expect(screen.getByTestId('empty-tag')).toBeInTheDocument();
  });

  test('renders StatusPopoverButton when status data is available with values', () => {
    // Ensure the memo finds the correct item (field + category).
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: 'attack-id',
      browserFields: {},
      dataFormattedForFieldBrowser: [{ field: 'kibana.alert.workflow_status', category: 'kibana' }],
    });

    (getEnrichedFieldInfo as jest.Mock).mockReturnValue({
      data: {
        field: 'kibana.alert.workflow_status',
        format: 'string',
        type: 'string',
        isObjectArray: false,
      },
      eventId: 'attack-id',
      values: ['open'], // <-- required by hasData()
    });

    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_STATUS_BLOCK_TEST_ID)).toBeInTheDocument();

    // Should show popover instead of empty tag
    expect(screen.getByTestId('status-popover')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-tag')).not.toBeInTheDocument();

    // Sanity-check we passed through enriched info
    expect(screen.getByTestId('status-popover')).toHaveTextContent('"eventId":"attack-id"');
    expect(screen.getByTestId('status-popover')).toHaveTextContent('"values":["open"]');

    // And ensure getEnrichedFieldInfo was called (optional but helpful)
    expect(getEnrichedFieldInfo).toHaveBeenCalled();
  });

  test('renders empty tag when getEnrichedFieldInfo returns no values array', () => {
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: 'attack-id',
      browserFields: {},
      dataFormattedForFieldBrowser: [{ field: 'kibana.alert.workflow_status', category: 'kibana' }],
    });

    // values missing -> hasData() should fail -> empty tag
    (getEnrichedFieldInfo as jest.Mock).mockReturnValue({
      data: { field: 'kibana.alert.workflow_status' },
      eventId: 'attack-id',
      values: undefined,
    });

    render(
      <TestProviders>
        <Status />
      </TestProviders>
    );

    expect(screen.getByTestId('empty-tag')).toBeInTheDocument();
    expect(screen.queryByTestId('status-popover')).not.toBeInTheDocument();
  });
});
