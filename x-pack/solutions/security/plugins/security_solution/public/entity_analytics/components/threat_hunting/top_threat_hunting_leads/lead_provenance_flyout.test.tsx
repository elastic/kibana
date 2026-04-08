/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { LeadProvenanceFlyout } from './lead_provenance_flyout';
import type { HuntingLead } from './types';

jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => value.toISOString(),
}));

jest.mock('../../../../common/utils/risk_color_palette', () => ({
  useRiskSeverityColors: () => ({
    low: '#54B399',
    medium: '#D6BF57',
    high: '#DA8B45',
    critical: '#E7664C',
  }),
}));

const mockLead: HuntingLead = {
  id: 'lead-1',
  title: 'Multi-Tactic Attack',
  byline: 'User jsmith with risk score 92',
  description: 'Investigation narrative here',
  entities: [
    { type: 'user', name: 'jsmith' },
    { type: 'host', name: 'server-01' },
  ],
  tags: ['Credential Access', 'Lateral Movement'],
  priority: 9,
  chatRecommendations: ['Check auth logs', 'Review network connections'],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh' as const,
  status: 'active' as const,
  observations: [
    {
      entityId: 'euid-1',
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 92,
      severity: 'critical' as const,
      confidence: 0.95,
      description: 'Risk score 92',
      metadata: {},
    },
    {
      entityId: 'euid-1',
      moduleId: 'behavioral_analysis',
      type: 'multi_tactic_attack',
      score: 80,
      severity: 'high' as const,
      confidence: 0.85,
      description: '5 distinct tactics',
      metadata: {},
    },
  ],
  sourceType: 'adhoc' as const,
};

const defaultProps = {
  lead: mockLead,
  onClose: jest.fn(),
};

describe('LeadProvenanceFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all sections (title, description, entities, observations, tags, recommendations)', () => {
    render(<LeadProvenanceFlyout {...defaultProps} />);

    expect(screen.getByTestId('leadProvenanceFlyout')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Multi-Tactic Attack' })).toBeInTheDocument();
    expect(screen.getByText('User jsmith with risk score 92')).toBeInTheDocument();
    expect(screen.getByText('Investigation narrative here')).toBeInTheDocument();

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('jsmith')).toBeInTheDocument();
    expect(screen.getByText('server-01')).toBeInTheDocument();

    expect(screen.getByText('Observations')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Credential Access')).toBeInTheDocument();
    expect(screen.getByText('Lateral Movement')).toBeInTheDocument();

    expect(screen.getByText('Chat Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Check auth logs')).toBeInTheDocument();
    expect(screen.getByText('Review network connections')).toBeInTheDocument();
  });

  it('groups observations by module', () => {
    render(<LeadProvenanceFlyout {...defaultProps} />);

    expect(screen.getByTestId('observation-high_risk_score')).toBeInTheDocument();
    expect(screen.getByTestId('observation-multi_tactic_attack')).toBeInTheDocument();

    expect(screen.getByText('Risk Analysis')).toBeInTheDocument();
    expect(screen.getByText('Alert Analysis')).toBeInTheDocument();
    expect(screen.getByText('Risk score 92')).toBeInTheDocument();
    expect(screen.getByText('5 distinct tactics')).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<LeadProvenanceFlyout {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('closeProvenanceFlyout'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('investigate button calls onInvestigateInChat', () => {
    const onInvestigateInChat = jest.fn();
    render(<LeadProvenanceFlyout {...defaultProps} onInvestigateInChat={onInvestigateInChat} />);

    fireEvent.click(screen.getByTestId('investigateInChatButton'));

    expect(onInvestigateInChat).toHaveBeenCalledTimes(1);
    expect(onInvestigateInChat).toHaveBeenCalledWith(mockLead);
  });

  it('dismiss button calls onDismiss', () => {
    const onDismiss = jest.fn();
    render(<LeadProvenanceFlyout {...defaultProps} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('dismissLeadButton'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(mockLead);
  });
});
