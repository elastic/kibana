/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ThreatHuntingLeadsFlyout } from './threat_hunting_leads_flyout';
import type { HuntingLead } from './types';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: jest.fn(),
}));

const mockUseQuery = jest.requireMock('@kbn/react-query').useQuery as jest.Mock;
const mockUseEntityAnalyticsRoutes = jest.requireMock('../../../api/api')
  .useEntityAnalyticsRoutes as jest.Mock;

const createMockLead = (overrides: Partial<HuntingLead> = {}): HuntingLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Test byline',
  description: 'Test description',
  entities: [{ type: 'user', name: 'jsmith' }],
  tags: ['tag1'],
  priority: 8,
  chatRecommendations: ['Check logs'],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh' as const,
  status: 'active' as const,
  observations: [],
  sourceType: 'adhoc' as const,
  ...overrides,
});

const createApiLead = (overrides: Partial<HuntingLead> = {}) => {
  const lead = createMockLead(overrides);
  return {
    ...lead,
    executionUuid: 'exec-uuid-1',
  };
};

const defaultProps = {
  onClose: jest.fn(),
  onSelectLead: jest.fn(),
};

describe('ThreatHuntingLeadsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityAnalyticsRoutes.mockReturnValue({ fetchLeads: jest.fn() });
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead()], total: 1 },
      isLoading: false,
    });
  });

  it('renders the flyout with title "All Hunting Leads"', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('threatHuntingLeadsFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All Hunting Leads' })).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<ThreatHuntingLeadsFlyout {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a lead item calls onSelectLead', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead({ id: 'lead-42', title: 'Clicked Lead' })], total: 1 },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadListItem-lead-42'));

    expect(onSelectLead).toHaveBeenCalledTimes(1);
    expect(onSelectLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-42', title: 'Clicked Lead' })
    );
  });
});
