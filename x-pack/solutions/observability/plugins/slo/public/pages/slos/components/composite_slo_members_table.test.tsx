/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render } from '../../../utils/test_helper';
import { CompositeSloMembersTable } from './composite_slo_members_table';

jest.mock('../../slo_details/shared_flyout/slo_details_flyout', () => ({
  __esModule: true,
  default: () => <div data-test-subj="sloDetailsFlyout" />,
}));

const baseMember = {
  id: 'member-1',
  name: 'Member SLO Alpha',
  weight: 2,
  normalisedWeight: 0.5,
  sliValue: 0.99,
  contribution: 0.495,
};

describe('CompositeSloMembersTable', () => {
  it('renders a status badge per member using the same labels as the SLO list', () => {
    render(
      <CompositeSloMembersTable
        members={[
          { ...baseMember, id: 'm-1', name: 'Healthy member', status: 'HEALTHY' },
          { ...baseMember, id: 'm-2', name: 'Degrading member', status: 'DEGRADING' },
          { ...baseMember, id: 'm-3', name: 'Violated member', status: 'VIOLATED' },
        ]}
        percentFormat="0.0%"
      />
    );

    const healthy = screen.getAllByText('Healthy');
    expect(healthy.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Degrading')).toBeInTheDocument();
    expect(screen.getByText('Violated')).toBeInTheDocument();
  });

  it('shows a tooltip for NO_DATA status', async () => {
    const user = userEvent.setup();
    render(
      <CompositeSloMembersTable
        members={[{ ...baseMember, status: 'NO_DATA' }]}
        percentFormat="0.0%"
      />
    );

    const noDataBadge = screen.getByText('No Data', { exact: false });
    expect(noDataBadge).toBeInTheDocument();
    await user.hover(noDataBadge);
    expect(
      await screen.findByText(
        /It may take some time before the data is aggregated and available for this member SLO/i
      )
    ).toBeInTheDocument();
  });
});
