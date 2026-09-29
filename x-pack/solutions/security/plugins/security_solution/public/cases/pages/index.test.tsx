/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useDispatch } from 'react-redux-v7';

import { useKibana, useNavigation } from '../../common/lib/kibana';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useUpsellingMessage } from '../../common/hooks/use_upselling';
import { useFetchNotes } from '../../notes/hooks/use_fetch_notes';
import { Cases } from '.';

vi.mock('react-redux-v7', () => {
  const mocked = {
    ...require('react-redux-v7'),
    useDispatch: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/lib/kibana', async () => {
  const mocked = {
    ...(await vi.importActual('../../common/lib/kibana')),
    useKibana: vi.fn(),
    useNavigation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/components/user_privileges', () => {
  const mocked = {
    useUserPrivileges: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => {
  const mocked = {
    useAlertsPrivileges: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/hooks/use_upselling', () => {
  const mocked = {
    useUpsellingMessage: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../notes/hooks/use_fetch_notes', () => {
  const mocked = {
    useFetchNotes: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/components/page_wrapper', () => {
  const mocked = {
    SecuritySolutionPageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/utils/route/spy_routes', () => {
  const mocked = {
    SpyRoute: () => null,
  };
  return { ...mocked, default: mocked };
});

describe('Cases page', () => {
  const mockGetCases = vi.fn();
  const mockCanUseCases = vi.fn();
  const mockReportEvent = vi.fn();
  const mockGetAppUrl = vi.fn();
  const mockNavigateTo = vi.fn();
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useDispatch as Mock).mockReturnValue(mockDispatch);
    (useNavigation as Mock).mockReturnValue({
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });
    (useUpsellingMessage as Mock).mockReturnValue('upselling-message');
    (useFetchNotes as Mock).mockReturnValue({ onLoad: vi.fn() });
    (useAlertsPrivileges as Mock).mockReturnValue({ hasAlertsRead: true, hasAlertsAll: true });

    mockGetCases.mockReturnValue(null);
    mockCanUseCases.mockReturnValue({ read: true, create: true, update: true, delete: true });

    (useKibana as Mock).mockReturnValue({
      services: {
        cases: {
          ui: { getCases: mockGetCases },
          helpers: { canUseCases: mockCanUseCases },
        },
        telemetry: { reportEvent: mockReportEvent },
      },
    });

    (useUserPrivileges as Mock).mockReturnValue({
      timelinePrivileges: { read: true },
      rulesPrivileges: { rules: { read: true } },
    });
  });

  it('does not pass ruleDetailsNavigation (removed in favor of in-row navigation)', () => {
    render(<Cases />);

    const getCasesArgs = mockGetCases.mock.calls[0][0];
    expect(getCasesArgs.ruleDetailsNavigation).toBeUndefined();
  });
});
