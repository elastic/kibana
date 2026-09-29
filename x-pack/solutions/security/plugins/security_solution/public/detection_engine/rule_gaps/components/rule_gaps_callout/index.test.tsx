/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleGapsCallout } from '.';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';

vi.mock('../../../../common/components/link_to');
vi.mock('../../api/hooks/use_get_rule_ids_with_gaps');
vi.mock('../../../../common/components/user_privileges');

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn().mockReturnValue({
        services: {
          docLinks: { links: { siem: { gapsTable: 'https://example.com' } } },
          spaces: {
            getActiveSpace: vi.fn().mockResolvedValue({ id: 'default' }),
          },
          uiSettings: { get: vi.fn() },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../context/gap_auto_fill_scheduler_context', () => {
      const mocked = {
      useGapAutoFillSchedulerContext: () => ({ scheduler: undefined }),
    };
      return { ...mocked, default: mocked };
    });

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RuleGapsCallout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGetRuleIdsWithGaps as Mock).mockReturnValue({
      data: {
        total: 5,
        latest_gap_timestamp: '2025-01-01T00:00:00.000Z',
        rule_ids: [],
      },
    });
  });

  it('does not render View dashboard without Security read (SIEM) privilege', async () => {
    (useUserPrivileges as Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      siemPrivileges: { crud: false, read: false },
    });

    renderWithI18n(<RuleGapsCallout />);

    await waitFor(() => {
      expect(screen.getByText('Monitoring tab')).toBeInTheDocument();
    });

    expect(screen.queryByText('View dashboard')).not.toBeInTheDocument();
  });

  it('renders View dashboard when user has Security read (SIEM) privilege', async () => {
    (useUserPrivileges as Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      siemPrivileges: { crud: false, read: true },
    });

    renderWithI18n(<RuleGapsCallout />);

    await waitFor(() => {
      expect(screen.getByText('View dashboard')).toBeInTheDocument();
    });
  });
});
