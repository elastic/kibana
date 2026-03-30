/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AttackRelatedAlertsDetails } from './attack_related_alerts_details';
import { useAttackDetailsContext } from '../../context';
import { useOriginalAlertIds } from '../../hooks/use_original_alert_ids';
import { ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE } from '../../constants/test_ids';

const mockCorrelationsDetailsAlertsTable = jest.fn((props: { 'data-test-subj'?: string }) => (
  <div data-test-subj={props['data-test-subj']}>{'CorrelationsDetailsAlertsTable'}</div>
));

jest.mock('../../context');
jest.mock('../../hooks/use_original_alert_ids');

jest.mock('../../../document_details/left/components/correlations_details_alerts_table', () => ({
  CorrelationsDetailsAlertsTable: (props: { [key: string]: unknown }) =>
    mockCorrelationsDetailsAlertsTable(props),
}));

const mockUseAttackDetailsContext = useAttackDetailsContext as jest.Mock;
const mockUseOriginalAlertIds = useOriginalAlertIds as jest.Mock;

const mockContext = {
  scopeId: 'timeline-1',
  attackId: 'attack-123',
};

describe('AttackRelatedAlertsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttackDetailsContext.mockReturnValue(mockContext);
    mockUseOriginalAlertIds.mockReturnValue(['alert-1', 'alert-2']);
  });

  it('renders CorrelationsDetailsAlertsTable with alertIds, scopeId and eventId from context', () => {
    render(
      <TestProviders>
        <AttackRelatedAlertsDetails />
      </TestProviders>
    );

    expect(screen.getByTestId(ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE)).toBeInTheDocument();
    expect(mockCorrelationsDetailsAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        alertIds: ['alert-1', 'alert-2'],
        scopeId: 'timeline-1',
        eventId: 'attack-123',
        loading: false,
        'data-test-subj': ATTACK_DETAILS_LEFT_INSIGHTS_CORRELATION_TABLE,
      })
    );
  });

  it('passes empty alertIds when hook returns empty array', () => {
    mockUseOriginalAlertIds.mockReturnValue([]);

    render(
      <TestProviders>
        <AttackRelatedAlertsDetails />
      </TestProviders>
    );

    expect(mockCorrelationsDetailsAlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        alertIds: [],
        scopeId: 'timeline-1',
        eventId: 'attack-123',
      })
    );
  });
});
