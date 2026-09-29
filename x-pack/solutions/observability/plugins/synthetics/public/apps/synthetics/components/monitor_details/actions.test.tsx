/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Actions } from './actions';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: vi.fn(),
    useLocation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-redux-v7', () => {
  const mocked = {
    ...require('react-redux-v7'),
    useDispatch: vi.fn(),
    useSelector: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./hooks/use_selected_monitor', () => {
  const mocked = {
    useSelectedMonitor: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('Actions Component', () => {
  let mockDispatch: Mock;

  beforeEach(() => {
    mockDispatch = vi.fn();

    (useDispatch as Mock).mockReturnValue(mockDispatch);
    (useSelector as Mock).mockReturnValue([]);
    (useParams as Mock).mockReturnValue({ monitorId: 'test-monitor-id' });
    (useLocation as Mock).mockReturnValue({ search: '?test=true' });
    (useSelectedMonitor as Mock).mockReturnValue({
      monitor: null,
      loading: false,
      error: null,
      isMonitorMissing: false,
    });
    (useKibana as Mock).mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addDanger: vi.fn(),
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
            getCasesContext: vi.fn(() => ({ children }: { children: React.ReactNode }) => (
              <div>{children}</div>
            )),
          },
          helpers: {
            canUseCases: vi.fn(() => ({
              read: true,
              update: true,
              push: true,
            })),
          },
          hooks: {
            useCasesAddToExistingCaseModal: vi.fn(() => ({
              open: vi.fn(),
            })),
          },
        },
      },
    });
  });

  it('renders all default action items', () => {
    render(<Actions />);

    fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

    expect(screen.getByText('Edit monitor')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Run test manually')).toBeInTheDocument();
  });

  describe('remote (CCS) monitor', () => {
    beforeEach(() => {
      (useLocation as Mock).mockReturnValue({ search: '?remoteName=cluster-1' });
    });

    it('disables Run test manually', () => {
      render(<Actions />);

      fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

      expect(screen.getByTestId('syntheticsRunTestManuallyButton')).toBeDisabled();
    });

    it('keeps Refresh enabled', () => {
      render(<Actions />);

      fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

      expect(screen.getByTestId('syntheticsRefreshContextItem')).not.toBeDisabled();
    });

    describe('Edit monitor', () => {
      it('redirects to the remote cluster when kibanaUrl is known', () => {
        (useSelectedMonitor as Mock).mockReturnValue({
          monitor: {
            config_id: 'test-monitor-id',
            remote: { remoteName: 'cluster-1', kibanaUrl: 'https://remote.example.com' },
          },
          loading: false,
          error: null,
          isMonitorMissing: false,
        });

        render(<Actions />);
        fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

        const editItem = screen.getByTestId('syntheticsEditMonitorContextItem');
        expect(editItem).not.toBeDisabled();
        expect(editItem).toHaveAttribute(
          'href',
          'https://remote.example.com/app/synthetics/edit-monitor/test-monitor-id'
        );
        expect(editItem).toHaveAttribute('target', '_blank');
      });

      it('renders disabled with a kibanaUrl-missing tooltip when remote.kibanaUrl is missing', () => {
        (useSelectedMonitor as Mock).mockReturnValue({
          monitor: {
            config_id: 'test-monitor-id',
            remote: { remoteName: 'cluster-1' },
          },
          loading: false,
          error: null,
          isMonitorMissing: false,
        });

        render(<Actions />);
        fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

        const editItem = screen.getByTestId('syntheticsEditMonitorContextItem');
        expect(editItem).toBeDisabled();
        expect(editItem).not.toHaveAttribute('href');
      });

      it('renders disabled when the remote monitor is not yet resolved', () => {
        // `useSelectedMonitor` returns `null` while the CCS lookup is in-flight,
        // so we treat the URL as missing and disable the item.
        (useSelectedMonitor as Mock).mockReturnValue({
          monitor: null,
          loading: true,
          error: null,
          isMonitorMissing: false,
        });

        render(<Actions />);
        fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

        expect(screen.getByTestId('syntheticsEditMonitorContextItem')).toBeDisabled();
      });
    });
  });

  describe('heartbeat (Elastic Agent) monitor', () => {
    beforeEach(() => {
      // No remoteName in the URL — heartbeat is detected from the resolved
      // monitor shape (origin === 'heartbeat'), not a URL param.
      (useSelectedMonitor as Mock).mockReturnValue({
        monitor: {
          config_id: 'test-monitor-id',
          name: 'Autodiscovered monitor',
          origin: 'heartbeat',
        },
        loading: false,
        error: null,
        isMonitorMissing: false,
      });
    });

    it('disables Edit monitor', () => {
      render(<Actions />);

      fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

      const editItem = screen.getByTestId('syntheticsEditMonitorContextItem');
      expect(editItem).toBeDisabled();
      expect(editItem).not.toHaveAttribute('href');
    });

    it('disables Run test manually', () => {
      render(<Actions />);

      fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

      expect(screen.getByTestId('syntheticsRunTestManuallyButton')).toBeDisabled();
    });

    it('keeps Refresh enabled', () => {
      render(<Actions />);

      fireEvent.click(screen.getByTestId('monitorDetailsHeaderControlActionsButton'));

      expect(screen.getByTestId('syntheticsRefreshContextItem')).not.toBeDisabled();
    });
  });
});
