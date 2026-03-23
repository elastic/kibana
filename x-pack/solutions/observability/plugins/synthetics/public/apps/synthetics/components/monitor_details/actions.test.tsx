/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Actions } from './actions';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe('Actions Component', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockReturnValue([]);
    (useParams as jest.Mock).mockReturnValue({ monitorId: 'test-monitor-id' });
    (useLocation as jest.Mock).mockReturnValue({ search: '?test=true' });
  });

  it('renders all default action items', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addDanger: jest.fn(),
          },
        },
        observabilityShared: {
          config: {
            unsafe: {
              investigativeExperienceEnabled: false,
            },
          },
        },
        cases: {
          ui: {
            getCasesContext: jest.fn(() => ({ children }: { children: React.ReactNode }) => (
              <div>{children}</div>
            )),
          },
          helpers: {
            canUseCases: jest.fn(() => ({
              read: true,
              update: true,
              push: true,
            })),
          },
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn(() => ({
              open: jest.fn(),
            })),
          },
        },
      },
    });
    render(<Actions />);

    // Open the popover
    fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

    expect(screen.getByText('Edit monitor')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Run test manually')).toBeInTheDocument();
  });
});
