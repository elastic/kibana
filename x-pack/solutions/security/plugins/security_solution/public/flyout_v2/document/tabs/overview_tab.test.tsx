/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { OverviewTab } from './overview_tab';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

const createAlertHit = (): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened: { 'event.kind': 'signal' },
    isAnchor: false,
  } as DataTableRecord);

describe('<OverviewTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FlyoutMissingAlertsPrivilege when document is an alert and user lacks alerts read privilege', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: false });
    const alertHit = createAlertHit();

    const { getByTestId } = render(
      <TestProviders>
        <OverviewTab hit={alertHit} renderCellActions={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('renders loading while alerts privileges are loading for an alert', () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: false, loading: true });
    const alertHit = createAlertHit();

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <OverviewTab hit={alertHit} renderCellActions={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('document-overview-loading')).toBeInTheDocument();
    expect(queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
  });
});
