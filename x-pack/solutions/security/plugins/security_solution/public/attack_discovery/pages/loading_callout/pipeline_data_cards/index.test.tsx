/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { PipelineDataCards } from '.';
import * as i18n from './translations';

describe('PipelineDataCards', () => {
  const defaultProps = {
    combinedAlertsCount: 50,
    discoveriesCount: 5,
    onViewData: jest.fn(),
    validatedCount: 3,
    retrievalWorkflows: [
      { alertsContextCount: 23, workflowName: 'Default Alert Retrieval' },
      { alertsContextCount: 27, workflowName: 'ESQL Alert Retrieval' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retrieval workflow badges', () => {
    it('renders a badge with the alert count for each retrieval workflow', () => {
      render(<PipelineDataCards {...defaultProps} />);

      expect(screen.getByTestId('retrievalBadge-0')).toHaveTextContent('23 alerts');
      expect(screen.getByTestId('retrievalBadge-1')).toHaveTextContent('27 alerts');
    });

    it('renders the workflow name for each retrieval workflow', () => {
      render(<PipelineDataCards {...defaultProps} />);

      expect(screen.getByText('Default Alert Retrieval')).toBeInTheDocument();
      expect(screen.getByText('ESQL Alert Retrieval')).toBeInTheDocument();
    });

    it('renders a single retrieval workflow', () => {
      const props = {
        ...defaultProps,
        retrievalWorkflows: [{ alertsContextCount: 42, workflowName: 'Default Retrieval' }],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('retrievalBadge-0')).toHaveTextContent('42 alerts');
      expect(screen.getByText('Default Retrieval')).toBeInTheDocument();
    });

    it('renders singular "alert" for a count of 1', () => {
      const props = {
        ...defaultProps,
        retrievalWorkflows: [{ alertsContextCount: 1, workflowName: 'Single Alert' }],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('retrievalBadge-0')).toHaveTextContent('1 alert');
    });

    it('renders retrieval badges with the expected color', () => {
      render(<PipelineDataCards {...defaultProps} />);

      // Blue-themed badges for retrieval
      const badge = screen.getByTestId('retrievalBadge-0');

      expect(badge).toBeInTheDocument();
    });
  });

  describe('unknown alert count (null alerts_context_count)', () => {
    it('renders a "?" badge when alertsContextCount is null', () => {
      const props = {
        ...defaultProps,
        retrievalWorkflows: [{ alertsContextCount: null, workflowName: 'Generic Workflow' }],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('unknownCountBadge')).toHaveTextContent('?');
    });

    it('renders the unknown count tooltip when alertsContextCount is null', () => {
      const props = {
        ...defaultProps,
        retrievalWorkflows: [{ alertsContextCount: null, workflowName: 'Generic Workflow' }],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('unknownCountTooltip')).toBeInTheDocument();
    });

    it('renders known counts alongside unknown counts', () => {
      const props = {
        ...defaultProps,
        retrievalWorkflows: [
          { alertsContextCount: 15, workflowName: 'Known Workflow' },
          { alertsContextCount: null, workflowName: 'Unknown Workflow' },
        ],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('retrievalBadge-0')).toHaveTextContent('15 alerts');
      expect(screen.getByTestId('unknownCountBadge')).toHaveTextContent('?');
    });
  });

  describe('combined alerts badge', () => {
    it('renders the combined alerts count badge', () => {
      render(<PipelineDataCards {...defaultProps} />);

      expect(screen.getByTestId('combinedAlertsBadge')).toHaveTextContent('50 combined alerts');
    });

    it('renders singular "alert" when combined count is 1', () => {
      const props = { ...defaultProps, combinedAlertsCount: 1 };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('combinedAlertsBadge')).toHaveTextContent('1 combined alert');
    });

    it('renders a "?" unknown badge when combinedAlertsCount is null', () => {
      const props = { ...defaultProps, combinedAlertsCount: null };

      render(<PipelineDataCards {...props} />);

      expect(screen.queryByTestId('combinedAlertsBadge')).not.toBeInTheDocument();
      expect(screen.getByTestId('unknownCountBadge')).toBeInTheDocument();
    });
  });

  describe('generation badge', () => {
    it('renders the discoveries count badge', () => {
      render(<PipelineDataCards {...defaultProps} />);

      expect(screen.getByTestId('discoveriesBadge')).toHaveTextContent('5 discoveries');
    });

    it('renders singular "discovery" when count is 1', () => {
      const props = { ...defaultProps, discoveriesCount: 1 };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('discoveriesBadge')).toHaveTextContent('1 discovery');
    });
  });

  describe('validation badge', () => {
    it('renders the validated count badge', () => {
      render(<PipelineDataCards {...defaultProps} />);

      expect(screen.getByTestId('validatedBadge')).toHaveTextContent('3 validated');
    });
  });

  describe('View data buttons', () => {
    it('renders a View data button for the retrieval step', () => {
      render(<PipelineDataCards {...defaultProps} />);

      const buttons = screen.getAllByText(i18n.VIEW_DATA);

      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onViewData with "retrieval" when the retrieval View data button is clicked', () => {
      render(<PipelineDataCards {...defaultProps} />);

      const button = screen.getByTestId('viewDataRetrieval');

      fireEvent.click(button);

      expect(defaultProps.onViewData).toHaveBeenCalledWith('retrieval');
    });

    it('calls onViewData with "generation" when the generation View data button is clicked', () => {
      render(<PipelineDataCards {...defaultProps} />);

      const button = screen.getByTestId('viewDataGeneration');

      fireEvent.click(button);

      expect(defaultProps.onViewData).toHaveBeenCalledWith('generation');
    });

    it('calls onViewData with "validation" when the validation View data button is clicked', () => {
      render(<PipelineDataCards {...defaultProps} />);

      const button = screen.getByTestId('viewDataValidation');

      fireEvent.click(button);

      expect(defaultProps.onViewData).toHaveBeenCalledWith('validation');
    });
  });

  describe('empty states', () => {
    it('renders nothing for retrieval when retrievalWorkflows is empty', () => {
      const props = { ...defaultProps, retrievalWorkflows: [] };

      render(<PipelineDataCards {...props} />);

      expect(screen.queryByTestId('retrievalBadge-0')).not.toBeInTheDocument();
    });

    it('renders zero count badges correctly', () => {
      const props = {
        ...defaultProps,
        combinedAlertsCount: 0,
        discoveriesCount: 0,
        validatedCount: 0,
        retrievalWorkflows: [{ alertsContextCount: 0, workflowName: 'Empty Workflow' }],
      };

      render(<PipelineDataCards {...props} />);

      expect(screen.getByTestId('retrievalBadge-0')).toHaveTextContent('0 alerts');
      expect(screen.getByTestId('combinedAlertsBadge')).toHaveTextContent('0 combined alerts');
      expect(screen.getByTestId('discoveriesBadge')).toHaveTextContent('0 discoveries');
      expect(screen.getByTestId('validatedBadge')).toHaveTextContent('0 validated');
    });
  });
});
