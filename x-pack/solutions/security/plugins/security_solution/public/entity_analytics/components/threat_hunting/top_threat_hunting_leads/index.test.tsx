/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { TopThreatHuntingLeads } from '.';
import type { HuntingLead, Observation } from './types';

const createMockObservation = (overrides: Partial<Observation> = {}): Observation => ({
  entityId: 'entity-1',
  moduleId: 'risk_analysis',
  type: 'high_risk_score',
  score: 80,
  severity: 'high',
  confidence: 0.9,
  description: 'Risk score above threshold',
  metadata: {},
  ...overrides,
});

const createMockLead = (overrides: Partial<HuntingLead> = {}): HuntingLead => ({
  id: 'lead-1',
  title: 'Multi-Tactic Attack',
  byline: 'User admin@example.com on host server-01',
  description: 'Evidence chain and investigation guide',
  entities: [{ type: 'user', name: 'admin@example.com' }],
  tags: ['malware', 'lateral-movement'],
  priority: 8,
  chatRecommendations: ['What happened?', 'Show timeline'],
  timestamp: '2026-03-13T12:00:00.000Z',
  staleness: 'fresh',
  status: 'active',
  observations: [createMockObservation()],
  sourceType: 'adhoc',
  ...overrides,
});

const defaultProps = {
  leads: [] as HuntingLead[],
  totalCount: 0,
  isLoading: false,
  isGenerating: false,
  onSeeAll: jest.fn(),
  onLeadClick: jest.fn(),
  onHuntInChat: jest.fn(),
  onGenerate: jest.fn(),
};

describe('TopThreatHuntingLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cards with mock leads data (shows card for each lead, max 5)', () => {
    const leads = [
      createMockLead({ id: 'lead-1', title: 'Lead One' }),
      createMockLead({ id: 'lead-2', title: 'Lead Two' }),
      createMockLead({ id: 'lead-3', title: 'Lead Three' }),
    ];

    render(<TopThreatHuntingLeads {...defaultProps} leads={leads} totalCount={3} />);

    expect(screen.getByTestId('topThreatHuntingLeads')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-1')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-2')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-3')).toBeInTheDocument();
  });

  it('renders at most 5 cards when more than 5 leads', () => {
    const leads = Array.from({ length: 7 }, (_, i) =>
      createMockLead({ id: `lead-${i}`, title: `Lead ${i}` })
    );

    render(<TopThreatHuntingLeads {...defaultProps} leads={leads} totalCount={7} />);

    expect(screen.getByTestId('leadCard-lead-0')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-1')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-2')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-3')).toBeInTheDocument();
    expect(screen.getByTestId('leadCard-lead-4')).toBeInTheDocument();
    expect(screen.queryByTestId('leadCard-lead-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leadCard-lead-6')).not.toBeInTheDocument();
  });

  it('renders empty state when no leads and never generated', () => {
    render(<TopThreatHuntingLeads {...defaultProps} />);

    expect(screen.getByTestId('topThreatHuntingLeads')).toBeInTheDocument();
    expect(screen.getByTestId('leadsEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('No hunting leads yet')).toBeInTheDocument();
    expect(screen.queryByTestId('leadsLoadingSpinner')).not.toBeInTheDocument();
  });

  it('renders "no data found" empty state after generation with no results', () => {
    render(<TopThreatHuntingLeads {...defaultProps} hasGenerated />);

    expect(screen.getByTestId('leadsEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders loading state (spinner visible)', () => {
    render(<TopThreatHuntingLeads {...defaultProps} isLoading />);

    expect(screen.getByTestId('topThreatHuntingLeads')).toBeInTheDocument();
    expect(screen.getByTestId('leadsLoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('leadsEmptyPrompt')).not.toBeInTheDocument();
  });

  it('"See All" button calls onSeeAll', () => {
    const onSeeAll = jest.fn();
    const lead = createMockLead();

    render(
      <TopThreatHuntingLeads {...defaultProps} leads={[lead]} totalCount={1} onSeeAll={onSeeAll} />
    );

    fireEvent.click(screen.getByTestId('seeAllLeadsButton'));

    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('"Generate" button calls onGenerate with loading state when isGenerating', () => {
    const onGenerate = jest.fn();

    const { rerender } = render(
      <TopThreatHuntingLeads {...defaultProps} onGenerate={onGenerate} />
    );

    fireEvent.click(screen.getByTestId('generateLeadsButton'));
    expect(onGenerate).toHaveBeenCalledTimes(1);

    rerender(<TopThreatHuntingLeads {...defaultProps} onGenerate={onGenerate} isGenerating />);

    const generateButton = screen.getByTestId('generateLeadsButton');
    expect(generateButton).toHaveTextContent('Generating...');
  });

  it('lead card click calls onLeadClick', () => {
    const onLeadClick = jest.fn();
    const lead = createMockLead({ id: 'lead-xyz', title: 'Test Lead' });

    render(
      <TopThreatHuntingLeads
        {...defaultProps}
        leads={[lead]}
        totalCount={1}
        onLeadClick={onLeadClick}
      />
    );

    fireEvent.click(screen.getByTestId('leadCard-lead-xyz'));

    expect(onLeadClick).toHaveBeenCalledTimes(1);
    expect(onLeadClick).toHaveBeenCalledWith(lead);
  });
});
