/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useKibana } from '../utils/kibana_react';
import { useSignalInvestigation, canOpenSignalInvestigation } from './use_signal_investigation';

jest.mock('../utils/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mock;

const platinum = { hasAtLeast: (minimum: 'platinum') => minimum === 'platinum' };
const basic = { hasAtLeast: () => false };

describe('canOpenSignalInvestigation', () => {
  it('is hidden when the plugin is absent', () => {
    expect(canOpenSignalInvestigation(undefined, platinum)).toBe(false);
  });

  it('is hidden below Platinum', () => {
    expect(canOpenSignalInvestigation({}, basic)).toBe(false);
    expect(canOpenSignalInvestigation({}, undefined)).toBe(false);
  });

  it('is shown when the plugin is present and the license is Platinum', () => {
    expect(canOpenSignalInvestigation({}, platinum)).toBe(true);
  });
});

describe('useSignalInvestigation', () => {
  const reportShown = jest.fn();

  const mockServices = (hasPlatinum: boolean) => {
    useKibanaMock.mockReturnValue({
      services: {
        licensing: {
          license$: new BehaviorSubject({ hasAtLeast: () => hasPlatinum }),
        },
        signalInvestigation: {
          reportShown,
          openInvestigation: jest.fn(),
        },
      },
    });
  };

  beforeEach(() => {
    reportShown.mockClear();
  });

  it('reports the supplied surface when the action becomes visible on Platinum', () => {
    mockServices(true);
    const { rerender } = renderHook(
      ({ visible }) => useSignalInvestigation('alertsTable', visible),
      { initialProps: { visible: false } }
    );

    expect(reportShown).not.toHaveBeenCalled();

    rerender({ visible: true });
    expect(reportShown).toHaveBeenCalledTimes(1);
    expect(reportShown).toHaveBeenCalledWith({ app: 'alerts', surface: 'alertsTable' });
  });

  it('does not report below Platinum', () => {
    mockServices(false);
    renderHook(() => useSignalInvestigation('alertDetails', true));
    expect(reportShown).not.toHaveBeenCalled();
  });
});
