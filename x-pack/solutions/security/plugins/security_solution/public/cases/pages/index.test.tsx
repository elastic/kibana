/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { SECURITY_FEATURE_ID } from '../../../common/constants';
import { useKibana, useNavigation } from '../../common/lib/kibana';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';
import { useFetchNotes } from '../../notes/hooks/use_fetch_notes';
import { Cases } from '.';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('../../common/components/user_privileges', () => ({
  useUserPrivileges: jest.fn(),
}));

jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn(),
}));

jest.mock('../../common/hooks/use_upselling', () => ({
  useUpsellingMessage: jest.fn(),
}));

jest.mock('../../notes/hooks/use_fetch_notes', () => ({
  useFetchNotes: jest.fn(),
}));

jest.mock('../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../common/utils/route/spy_routes', () => ({
  SpyRoute: () => null,
}));

describe('Cases page', () => {
  const mockGetCases = jest.fn();
  const mockCanUseCases = jest.fn();
  const mockOpenFlyout = jest.fn();
  const mockReportEvent = jest.fn();
  const mockGetAppUrl = jest.fn();
  const mockNavigateTo = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openFlyout: mockOpenFlyout });
    (useNavigation as jest.Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });
    (useUpsellingMessage as jest.Mock).mockReturnValue('upselling-message');
    (useFetchNotes as jest.Mock).mockReturnValue({ onLoad: jest.fn() });
    (useAlertsPrivileges as jest.Mock).mockReturnValue({ hasAlertsRead: true, hasAlertsAll: true });

    mockGetCases.mockReturnValue(null);
    mockCanUseCases.mockReturnValue({ read: true, create: true, update: true, delete: true });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: { configurations: false },
          },
        },
        cases: {
          ui: { getCases: mockGetCases },
          helpers: { canUseCases: mockCanUseCases },
        },
        telemetry: { reportEvent: mockReportEvent },
      },
    });

    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
      rulesPrivileges: { rules: { read: true } },
    });
  });

  it('passes ruleDetailsNavigation when rules are readable and EASE is disabled', () => {
    render(<Cases />);

    const getCasesArgs = mockGetCases.mock.calls[0][0];
    expect(getCasesArgs.ruleDetailsNavigation).toEqual({
      onClick: expect.any(Function),
    });
  });

  it('does not pass ruleDetailsNavigation when EASE is enabled', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: { configurations: true },
          },
        },
        cases: {
          ui: { getCases: mockGetCases },
          helpers: { canUseCases: mockCanUseCases },
        },
        telemetry: { reportEvent: mockReportEvent },
      },
    });

    render(<Cases />);

    const getCasesArgs = mockGetCases.mock.calls[0][0];
    expect(getCasesArgs.ruleDetailsNavigation).toBeUndefined();
  });

  it('does not pass ruleDetailsNavigation when rules are not readable', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { read: true },
      rulesPrivileges: { rules: { read: false } },
    });

    render(<Cases />);

    const getCasesArgs = mockGetCases.mock.calls[0][0];
    expect(getCasesArgs.ruleDetailsNavigation).toBeUndefined();
  });
});
