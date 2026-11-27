/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { RiskScoreLeftPanelSubTab } from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useEntityRiskScores } from '../../../../../entity_analytics/api/hooks/use_entity_risk_scores';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import {
  mockAiAgentEntityRiskScores,
  mockAiAgentId,
  mockAiAgentRiskScoreState,
} from '../../../shared/mocks';
import { RiskSummarySection } from './risk_summary_section';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/api/hooks/use_entity_risk_scores');
jest.mock(
  '../../../../../common/components/visualization_actions/visualization_embeddable',
  () => ({
    VisualizationEmbeddable: () => <div data-test-subj="visualization-embeddable" />,
  })
);

const renderSection = (onShowAgent = jest.fn()) =>
  render(
    <TestProviders>
      <RiskSummarySection
        entityId={mockAiAgentId}
        entityName="claude_code"
        scopeId="scope-1"
        onShowAgent={onShowAgent}
      />
    </TestProviders>
  );

describe('RiskSummarySection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useEntityRiskScores).mockReturnValue(mockAiAgentEntityRiskScores);
  });

  it('reads the agent base score by its entity ID', () => {
    renderSection();
    expect(useEntityRiskScores).toHaveBeenCalledWith(EntityType.ai_agent, mockAiAgentId);
  });

  it('shows the shared risk summary with the watchlist modifier contribution', () => {
    renderSection();
    expect(screen.getByTestId('risk-summary-table')).toHaveTextContent('Alerts (13)+64.76');
    expect(screen.getByTestId('risk-summary-table')).toHaveTextContent('Watchlists (1)+8.62');
  });

  it('opens the risk inputs flyout for the agent from the risk contributions link', () => {
    const onShowAgent = jest.fn();
    renderSection(onShowAgent);
    fireEvent.click(screen.getByTestId('entityRiskInputsTitleLink'));
    expect(flyoutApi.openEntityRiskInputs).toHaveBeenCalledWith({
      entityType: EntityType.ai_agent,
      entityName: 'claude_code',
      entityId: mockAiAgentId,
      scopeId: 'scope-1',
      onShowEntity: onShowAgent,
      title: 'claude_code',
      subTab: RiskScoreLeftPanelSubTab.ENTITY,
      origin: FLYOUT_ORIGIN.RISK_SUMMARY_ENTITY,
    });
  });

  it('renders nothing until the agent has a score', () => {
    jest.mocked(useEntityRiskScores).mockReturnValue({
      ...mockAiAgentEntityRiskScores,
      base: { ...mockAiAgentRiskScoreState, data: [] },
    });
    renderSection();
    expect(screen.queryByTestId('risk-summary-table')).not.toBeInTheDocument();
  });
});
