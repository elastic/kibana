/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { BriefJob } from '../../../../../common/entity_analytics/executive_brief/document';
import { buildBriefResponse } from '../__fixtures__/flyout_brief_document';
import type { UseBriefResult } from '../hooks/use_brief';
import { ExecutiveBriefFlyout } from './executive_brief_flyout';

const mockUseBrief = jest.fn();
const mockUseBriefConnectors = jest.fn();
const mockGenerate = jest.fn();
const mockUseGenerateBrief = jest.fn();

jest.mock('../hooks/use_brief', () => ({
  useBrief: () => mockUseBrief(),
}));
jest.mock('../hooks/use_brief_connectors', () => ({
  useBriefConnectors: () => mockUseBriefConnectors(),
}));
jest.mock('../hooks/use_generate_brief', () => ({
  useGenerateBrief: () => mockUseGenerateBrief(),
}));
jest.mock('./use_brief_flyout_actions', () => ({
  useBriefFlyoutActions: () => ({ openEntity: jest.fn(), openThreat: jest.fn() }),
}));
jest.mock('../brief/threats/priority_threats', () => ({
  PriorityThreats: () => <div data-test-subj="mockPriorityThreats" />,
}));
jest.mock('../brief/actions/recommended_actions', () => ({
  RecommendedActions: () => <div data-test-subj="mockRecommendedActions" />,
}));

const noBrief: UseBriefResult = {
  document: undefined,
  isLoading: false,
  isGenerating: false,
  error: undefined,
  refetch: jest.fn(),
};

const job = (overrides: Partial<BriefJob>): BriefJob => ({
  id: 'job-2',
  status: 'running',
  started_at: '2026-10-10T10:00:00.000Z',
  ...overrides,
});

const renderFlyout = () =>
  render(
    <I18nProvider>
      <ExecutiveBriefFlyout timeRange="7d" onClose={jest.fn()} />
    </I18nProvider>
  );

describe('ExecutiveBriefFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBrief.mockReturnValue(noBrief);
    mockUseBriefConnectors.mockReturnValue({
      connectors: [
        { id: 'connector-1', name: 'Anthropic Claude Sonnet 5' },
        { id: 'connector-2', name: 'Another model' },
      ],
      isLoading: false,
      selectedId: 'connector-1',
      setSelectedId: jest.fn(),
      getConnectorName: (id?: string) =>
        id === 'connector-1' ? 'Anthropic Claude Sonnet 5' : undefined,
    });
    mockUseGenerateBrief.mockReturnValue({
      generate: mockGenerate,
      isStarting: false,
      error: undefined,
    });
  });

  describe('without a brief', () => {
    it('shows the start panel and generates only on click', () => {
      renderFlyout();

      expect(screen.getByTestId('executiveBriefStartPanel')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefRegenerate')).not.toBeInTheDocument();
      expect(mockGenerate).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('executiveBriefGenerate'));

      expect(mockGenerate).toHaveBeenCalledWith({ range: '7d', connectorId: 'connector-1' });
    });

    it('disables generating when there is no AI connector', () => {
      mockUseBriefConnectors.mockReturnValue({
        connectors: [],
        isLoading: false,
        selectedId: undefined,
        setSelectedId: jest.fn(),
        getConnectorName: () => undefined,
      });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefGenerate')).toBeDisabled();
      expect(screen.getByTestId('executiveBriefStartPanel')).toHaveTextContent('AI connector');
      expect(screen.queryByTestId('executiveBriefConnectorPicker')).not.toBeInTheDocument();
    });

    it('shows a standard loader while the first load is in flight', () => {
      mockUseBrief.mockReturnValue({ ...noBrief, isLoading: true });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefStartPanel')).not.toBeInTheDocument();
    });

    it('shows a load error with a way to retry', () => {
      const refetch = jest.fn();
      mockUseBrief.mockReturnValue({ ...noBrief, error: new Error('Network down'), refetch });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefError')).toHaveTextContent('Network down');

      fireEvent.click(within(screen.getByTestId('executiveBriefError')).getByRole('button'));

      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('while a first brief is generating', () => {
    it.each([
      ['gather', 'Gathering evidence…'],
      ['compose', 'Writing the brief…'],
      ['verify', 'Checking the brief…'],
    ] as const)('shows a loader with the %s stage', (stage, label) => {
      mockUseBrief.mockReturnValue({
        ...noBrief,
        isGenerating: true,
        document: buildBriefResponse({
          job: job({ status: 'running', stage }),
          brief: undefined,
          evidence: undefined,
          generated_at: undefined,
        }),
      });
      renderFlyout();

      const loading = screen.getByTestId('executiveBriefLoading');
      expect(loading).toHaveTextContent(label);
      expect(loading.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefStartPanel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefAtAGlance')).not.toBeInTheDocument();
      expect(screen.getByTestId('executiveBriefRegenerate')).toBeDisabled();
    });

    it('shows the loader while the start request is in flight', () => {
      mockUseGenerateBrief.mockReturnValue({
        generate: mockGenerate,
        isStarting: true,
        error: undefined,
      });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefLoading')).toBeInTheDocument();
    });
  });

  describe('with a brief', () => {
    it('renders the header, the three sections and the footer action', () => {
      mockUseBrief.mockReturnValue({ ...noBrief, document: buildBriefResponse() });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefMeta')).toHaveTextContent(
        /^Generated .+ · Last 7 days · Anthropic Claude Sonnet 5$/
      );
      expect(screen.getByTestId('executiveBriefAtAGlance')).toBeInTheDocument();
      expect(screen.getByTestId('mockPriorityThreats')).toBeInTheDocument();
      expect(screen.getByTestId('mockRecommendedActions')).toBeInTheDocument();
      expect(screen.getByTestId('executiveBriefConnectorPicker')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefLoading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefGeneratingCallout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefError')).not.toBeInTheDocument();
    });

    it('shows the Based on pills, with a reason for unavailable sources', () => {
      mockUseBrief.mockReturnValue({ ...noBrief, document: buildBriefResponse() });
      renderFlyout();

      const basedOn = screen.getByTestId('executiveBriefBasedOn');
      expect(
        within(basedOn).getByTestId('executiveBriefBasedOn-attack_discoveries')
      ).toHaveTextContent('Attack discoveries · 2');
      expect(
        within(basedOn).getByTestId('executiveBriefBasedOn-hunting_leads-unavailable')
      ).toHaveTextContent('Hunting leads: unavailable');
    });

    it('shows jump-to tabs with section counts', () => {
      mockUseBrief.mockReturnValue({ ...noBrief, document: buildBriefResponse() });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefJumpNav-executiveBriefAtAGlance')).toHaveTextContent(
        'At a glance'
      );
      expect(
        screen.getByTestId('executiveBriefJumpNavCount-executiveBriefThreats')
      ).toHaveTextContent('2');
      expect(
        screen.getByTestId('executiveBriefJumpNavCount-executiveBriefActions')
      ).toHaveTextContent('1');
    });

    it('regenerates for the page time range with the selected connector', () => {
      mockUseBrief.mockReturnValue({ ...noBrief, document: buildBriefResponse() });
      renderFlyout();

      fireEvent.click(screen.getByTestId('executiveBriefRegenerate'));

      expect(mockGenerate).toHaveBeenCalledWith({ range: '7d', connectorId: 'connector-1' });
    });
  });

  describe('with a previous brief while a new one generates', () => {
    beforeEach(() => {
      mockUseBrief.mockReturnValue({
        ...noBrief,
        isGenerating: true,
        document: buildBriefResponse({ job: job({ status: 'running', stage: 'compose' }) }),
      });
    });

    it('keeps the previous brief readable under a subtle callout', () => {
      renderFlyout();

      expect(screen.getByTestId('executiveBriefGeneratingCallout')).toHaveTextContent(
        'Generating a new brief…'
      );
      expect(screen.getByTestId('executiveBriefAtAGlance')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefLoading')).not.toBeInTheDocument();
    });

    it('does not allow starting another run or switching the model', () => {
      renderFlyout();

      expect(screen.getByTestId('executiveBriefRegenerate')).toBeDisabled();
      expect(screen.getByTestId('executiveBriefConnectorPicker')).toBeDisabled();
    });
  });

  describe('when generation failed', () => {
    it('shows the error with Regenerate and no brief', () => {
      mockUseBrief.mockReturnValue({
        ...noBrief,
        document: buildBriefResponse({
          job: job({
            status: 'failed',
            error: { code: 'llm_error', message: 'The model could not be reached' },
          }),
          brief: undefined,
          evidence: undefined,
          generated_at: undefined,
        }),
      });
      renderFlyout();

      const error = screen.getByTestId('executiveBriefError');
      expect(error).toHaveTextContent('The brief could not be generated');
      expect(error).toHaveTextContent('The model could not be reached');
      expect(screen.queryByTestId('executiveBriefAtAGlance')).not.toBeInTheDocument();

      fireEvent.click(within(error).getByRole('button', { name: 'Regenerate' }));

      expect(mockGenerate).toHaveBeenCalledWith({ range: '7d', connectorId: 'connector-1' });
    });

    it('still shows the previous brief', () => {
      mockUseBrief.mockReturnValue({
        ...noBrief,
        document: buildBriefResponse({
          job: job({ status: 'failed', error: { code: 'timeout', message: 'Timed out' } }),
        }),
      });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefError')).toHaveTextContent('Timed out');
      expect(screen.getByTestId('executiveBriefAtAGlance')).toBeInTheDocument();
    });

    it('shows the error when starting the job failed', () => {
      mockUseGenerateBrief.mockReturnValue({
        generate: mockGenerate,
        isStarting: false,
        error: Object.assign(new Error('Request failed'), {
          body: { message: 'Too many briefs are running' },
        }),
      });
      renderFlyout();

      expect(screen.getByTestId('executiveBriefError')).toHaveTextContent(
        'Too many briefs are running'
      );
    });
  });
});
