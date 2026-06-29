/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { allCasesPermissions, noCasesPermissions } from '../../../../cases_test_utils';
import { useBehavioralAnomalyRowActions } from './use_behavioral_anomaly_row_actions';
import type { BehavioralAnomalyTableRow } from '../types';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('@kbn/ml-plugin/public', () => {
  const actual = jest.requireActual('@kbn/ml-plugin/public');
  return {
    ...actual,
    useMlHref: jest.fn(() => 'http://ml-url'),
  };
});

const useKibanaMock = useKibana as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useInvestigateInTimelineMock = useInvestigateInTimeline as jest.Mock;

const row: BehavioralAnomalyTableRow = {
  id: 'anomaly-row-0',
  jobId: 'auth_high_count_logon',
  jobDisplayName: 'Failed authentication spike',
  timestamp: 1717074000000,
  baseline: '~2 events/min',
  anomaly: '84 events/min',
  spike: '42x',
  anomalyScore: 92,
  detectorIndex: 0,
  entities: { 'user.name': 'john.doe' },
  underlyingEvents: [
    { _id: 'evt-1', _index: 'logs-*' },
    { _id: 'evt-2', _index: 'logs-*' },
  ],
};

const caseModalOpen = jest.fn();
const investigateInTimeline = jest.fn();
const getUrlForApp = jest.fn().mockReturnValue('http://discover-url');
const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

const setupKibana = ({
  withMl = true,
  casesPermissions = allCasesPermissions(),
}: { withMl?: boolean; casesPermissions?: ReturnType<typeof allCasesPermissions> } = {}) => {
  useKibanaMock.mockReturnValue({
    services: {
      cases: {
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: caseModalOpen }),
        },
        helpers: {
          canUseCases: jest.fn().mockReturnValue(casesPermissions),
        },
      },
      application: { getUrlForApp },
      http: { basePath: { get: () => '' } },
      ml: withMl ? {} : undefined,
    },
  });
};

describe('useBehavioralAnomalyRowActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
    useUserPrivilegesMock.mockReturnValue({ timelinePrivileges: { read: true, crud: true } });
    useInvestigateInTimelineMock.mockReturnValue({ investigateInTimeline });
  });

  const renderActions = (overrides: Partial<BehavioralAnomalyTableRow> = {}) => {
    const closePopover = jest.fn();
    const { result } = renderHook(() =>
      useBehavioralAnomalyRowActions({
        row: { ...row, ...overrides },
        closePopover,
      })
    );
    return { result, closePopover };
  };

  it('returns the four panel actions in order and a separate addToChat handler', () => {
    const { result } = renderActions();

    expect(result.current.actions.map((action) => action.key)).toEqual([
      'add-to-case',
      'add-to-timeline',
      'view-in-discover',
      'view-in-single-metric-viewer',
    ]);
    expect(result.current.addToChat).toEqual(
      expect.objectContaining({ label: expect.any(String), onClick: expect.any(Function) })
    );
  });

  it('uses the briefcase icon for Add to case and productDiscover for View in Discover', () => {
    const { result } = renderActions();

    const addToCase = result.current.actions.find((action) => action.key === 'add-to-case');
    const viewInDiscover = result.current.actions.find(
      (action) => action.key === 'view-in-discover'
    );

    expect(addToCase?.icon).toBe('briefcase');
    expect(viewInDiscover?.icon).toBe('productDiscover');
  });

  it('omits Add to case when user lacks case permissions', () => {
    setupKibana({ casesPermissions: noCasesPermissions() });
    const { result } = renderActions();

    expect(result.current.actions.map((action) => action.key)).not.toContain('add-to-case');
  });

  it('omits Add to timeline when user lacks timeline read', () => {
    useUserPrivilegesMock.mockReturnValue({ timelinePrivileges: { read: false, crud: false } });
    const { result } = renderActions();

    expect(result.current.actions.map((action) => action.key)).not.toContain('add-to-timeline');
  });

  it('omits Single metric viewer when ml service is unavailable', () => {
    setupKibana({ withMl: false });
    const { result } = renderActions();

    expect(result.current.actions.map((action) => action.key)).not.toContain(
      'view-in-single-metric-viewer'
    );
  });

  it('opens the Select case modal with event attachments', () => {
    const { result, closePopover } = renderActions();
    const addToCase = result.current.actions.find((action) => action.key === 'add-to-case');

    act(() => {
      addToCase?.onClick();
    });

    expect(closePopover).toHaveBeenCalled();
    expect(caseModalOpen).toHaveBeenCalledWith(
      expect.objectContaining({ getAttachments: expect.any(Function) })
    );
  });

  it('investigates underlying event ids in Timeline', () => {
    const { result } = renderActions();
    const addToTimeline = result.current.actions.find(
      (action) => action.key === 'add-to-timeline'
    );

    act(() => {
      addToTimeline?.onClick();
    });

    expect(investigateInTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { language: 'kuery', query: '_id: ("evt-1" OR "evt-2")' },
      })
    );
  });

  it('opens Discover in a new tab', () => {
    const { result } = renderActions();
    const viewInDiscover = result.current.actions.find(
      (action) => action.key === 'view-in-discover'
    );

    act(() => {
      viewInDiscover?.onClick();
    });

    expect(getUrlForApp).toHaveBeenCalledWith(
      'discover',
      expect.objectContaining({ path: expect.stringContaining('#/?_a=') })
    );
    expect(openSpy).toHaveBeenCalledWith('http://discover-url', '_blank', 'noopener,noreferrer');
  });

  it('opens Single metric viewer in a new tab', () => {
    const { result } = renderActions();
    const viewInSmv = result.current.actions.find(
      (action) => action.key === 'view-in-single-metric-viewer'
    );

    act(() => {
      viewInSmv?.onClick();
    });

    expect(openSpy).toHaveBeenCalledWith('http://ml-url', '_blank', 'noopener,noreferrer');
  });

  it('Add to chat closes the popover without side effects', () => {
    const { result, closePopover } = renderActions();

    act(() => {
      result.current.addToChat.onClick();
    });

    expect(closePopover).toHaveBeenCalled();
    expect(investigateInTimeline).not.toHaveBeenCalled();
    expect(caseModalOpen).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
