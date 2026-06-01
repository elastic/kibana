/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ResultCard } from '../result_renderer';
import type { ActionResult } from '../types';

describe('ResultCard', () => {
  describe('pending status', () => {
    const pendingResult: ActionResult = {
      actionId: 'action-abc-001',
      status: 'pending',
      timestamp: '2024-01-15T14:32:00.000Z',
    };

    it('renders the Pending badge', () => {
      const { getByText } = render(<ResultCard result={pendingResult} />);

      expect(getByText('Pending')).toBeInTheDocument();
    });

    it('renders the action ID', () => {
      const { getByText } = render(<ResultCard result={pendingResult} />);

      expect(getByText(/action-abc-001/)).toBeInTheDocument();
    });

    it('renders the timestamp', () => {
      const { getByText } = render(<ResultCard result={pendingResult} />);

      expect(getByText(/2024-01-15T14:32:00\.000Z/)).toBeInTheDocument();
    });

    it('does not render an error message', () => {
      const { queryByText } = render(<ResultCard result={pendingResult} />);

      expect(queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('uses data-test-subj ending with pending', () => {
      const { getByTestId } = render(<ResultCard result={pendingResult} />);

      expect(getByTestId('endpoint-response-action-result-pending')).toBeInTheDocument();
    });

    it('matches snapshot', () => {
      const { container } = render(<ResultCard result={pendingResult} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('completed status', () => {
    const completedResult: ActionResult = {
      actionId: 'action-abc-002',
      status: 'completed',
      timestamp: '2024-01-15T14:32:15.000Z',
    };

    it('renders the Completed badge', () => {
      const { getByText } = render(<ResultCard result={completedResult} />);

      expect(getByText('Completed')).toBeInTheDocument();
    });

    it('renders the action ID', () => {
      const { getByText } = render(<ResultCard result={completedResult} />);

      expect(getByText(/action-abc-002/)).toBeInTheDocument();
    });

    it('uses data-test-subj ending with completed', () => {
      const { getByTestId } = render(<ResultCard result={completedResult} />);

      expect(getByTestId('endpoint-response-action-result-completed')).toBeInTheDocument();
    });

    it('does not render an error message', () => {
      const { queryByText } = render(<ResultCard result={completedResult} />);

      expect(queryByText(/agent unreachable/i)).not.toBeInTheDocument();
    });

    it('matches snapshot', () => {
      const { container } = render(<ResultCard result={completedResult} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('failed status', () => {
    const failedResult: ActionResult = {
      actionId: 'action-abc-003',
      status: 'failed',
      timestamp: '2024-01-15T14:32:08.000Z',
      errorMessage: 'Agent unreachable: connection timed out after 30s',
    };

    it('renders the Failed badge', () => {
      const { getByText } = render(<ResultCard result={failedResult} />);

      expect(getByText('Failed')).toBeInTheDocument();
    });

    it('renders the action ID', () => {
      const { getByText } = render(<ResultCard result={failedResult} />);

      expect(getByText(/action-abc-003/)).toBeInTheDocument();
    });

    it('uses data-test-subj ending with failed', () => {
      const { getByTestId } = render(<ResultCard result={failedResult} />);

      expect(getByTestId('endpoint-response-action-result-failed')).toBeInTheDocument();
    });

    it('renders the error message', () => {
      const { getByText } = render(<ResultCard result={failedResult} />);

      expect(getByText('Agent unreachable: connection timed out after 30s')).toBeInTheDocument();
    });

    it('matches snapshot', () => {
      const { container } = render(<ResultCard result={failedResult} />);

      expect(container).toMatchSnapshot();
    });
  });

  describe('failed status without errorMessage', () => {
    it('renders without an error message section', () => {
      const result: ActionResult = {
        actionId: 'action-abc-004',
        status: 'failed',
        timestamp: '2024-01-15T14:32:10.000Z',
      };
      const { queryByText } = render(<ResultCard result={result} />);

      expect(queryByText(/agent unreachable/i)).not.toBeInTheDocument();
    });
  });
});
