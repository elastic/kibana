/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { render } from '@testing-library/react';
import { AlertStatus } from './alert_status';
import { WORKFLOW_STATUS_DETAILS_TEST_ID, WORKFLOW_STATUS_TITLE_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('../../../common/lib/kibana');

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHitWithStatus = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.workflow_user': 'user-id-1',
  'kibana.alert.workflow_status_updated_at': ['2023-11-01T22:33:26.893Z'],
});

const alertHitWithoutWorkflowUser = createMockHit({
  'event.kind': 'signal',
  'kibana.alert.workflow_status_updated_at': '2023-11-01T22:33:26.893Z',
});

const renderAlertStatus = (hit: DataTableRecord) =>
  render(
    <TestProviders>
      <AlertStatus hit={hit} />
    </TestProviders>
  );

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1', full_name: 'User 1' }, data: {} },
];

describe('<AlertStatus />', () => {
  let bulkGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    bulkGet = jest.fn().mockResolvedValue(mockUserProfiles);
    (useAppToasts as jest.Mock).mockReturnValue({ addError: jest.fn() });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        core: {
          userProfile: {
            bulkGet,
          },
        },
      },
    });
  });

  it('should render alert status history information', async () => {
    const { findByTestId } = renderAlertStatus(alertHitWithStatus);

    expect(await findByTestId(WORKFLOW_STATUS_TITLE_TEST_ID)).toBeInTheDocument();
    expect(await findByTestId(WORKFLOW_STATUS_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(await findByTestId(WORKFLOW_STATUS_DETAILS_TEST_ID)).toHaveTextContent(
      'Alert status updated by'
    );
    expect(await findByTestId(WORKFLOW_STATUS_DETAILS_TEST_ID)).toHaveTextContent('User 1');
    expect(bulkGet).toHaveBeenCalledTimes(1);
  });

  it('should render empty component if missing workflow_user value', async () => {
    const { container } = renderAlertStatus(alertHitWithoutWorkflowUser);

    expect(container).toBeEmptyDOMElement();
  });
});
