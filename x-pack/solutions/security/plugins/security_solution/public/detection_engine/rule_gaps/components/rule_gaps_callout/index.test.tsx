/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleGapsCallout } from '.';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';

jest.mock('../../../../common/components/link_to');
jest.mock('../../api/hooks/use_get_rule_ids_with_gaps');
jest.mock('../../../../common/components/user_privileges');

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      docLinks: { links: { siem: { gapsTable: 'https://example.com' } } },
      spaces: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      },
      uiSettings: { get: jest.fn() },
    },
  }),
}));

jest.mock('../../context/gap_auto_fill_scheduler_context', () => ({
  useGapAutoFillSchedulerContext: () => ({ scheduler: undefined }),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RuleGapsCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetRuleIdsWithGaps as jest.Mock).mockReturnValue({
      data: {
        total: 5,
        latest_gap_timestamp: '2025-01-01T00:00:00.000Z',
        rule_ids: [],
      },
    });
  });

  it('does not render View dashboard without Security read (SIEM) privilege', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
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
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      siemPrivileges: { crud: false, read: true },
    });

    renderWithI18n(<RuleGapsCallout />);

    await waitFor(() => {
      expect(screen.getByText('View dashboard')).toBeInTheDocument();
    });
  });
});
