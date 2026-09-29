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
import { AlertsTable as ResponseOpsAlertsTable } from '@kbn/response-ops-alerts-table';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { TableId } from '@kbn/securitysolution-data-table';
import { TestProviders } from '../../../common/mock';
import { BULK_ALERTS_ATTACHMENT_PROMPT } from '../../../agent_builder/components/prompts';
import { alertsToAttachmentGroup } from '../../../agent_builder/helpers';
import { useReportAddToChat } from '../../../agent_builder/hooks/use_report_add_to_chat';
import { AlertsTable } from '.';

vi.mock('@kbn/response-ops-alerts-table', () => {
      const mocked = {
      AlertsTable: vi.fn(() => null),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../agent_builder/hooks/use_report_add_to_chat');
vi.mock('../../../agent_builder/hooks/use_agent_builder_availability', () => {
      const mocked = {
      useAgentBuilderAvailability: vi.fn(() => ({
        isAgentBuilderEnabled: true,
        hasAgentBuilderPrivilege: true,
        isAgentChatExperienceEnabled: true,
        hasValidAgentBuilderLicense: false,
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../agent_builder/helpers', () => {
      const mocked = {
      alertsToAttachmentGroup: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(() => ({
        services: {
          data: {},
          http: {},
          notifications: {},
          rendering: {},
          fieldFormats: {},
          application: {},
          licensing: {},
          uiSettings: { get: vi.fn() },
          settings: {},
          cases: {},
          agentBuilder: {},
        },
      })),
      KibanaServices: {
        getKibanaVersion: vi.fn(() => '8.0.0'),
      },
      KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn(() => ({
        from: '2020-01-01T00:00:00Z',
        to: '2020-01-02T00:00:00Z',
        setQuery: vi.fn(),
        deleteQuery: vi.fn(),
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: vi.fn(() => false),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../data_view_manager/hooks/use_data_view', () => {
      const mocked = {
      useDataView: vi.fn(() => ({
        dataView: { getRuntimeMappings: vi.fn(() => ({})) },
        status: 'ready',
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../data_view_manager/hooks/use_browser_fields', () => {
      const mocked = {
      useBrowserFields: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/hooks/use_license', () => {
      const mocked = {
      useLicense: vi.fn(() => ({
        isEnterprise: vi.fn(() => false),
        isPlatinumPlus: vi.fn(() => false),
        isGold: vi.fn(() => false),
        getType: vi.fn(() => 'basic'),
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/hooks/use_selector', () => {
      const mocked = {
      useDeepEqualSelector: vi.fn(() => []),
      useShallowEqualSelector: vi.fn(() => ({})),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/trigger_actions_alert_table/use_bulk_actions', () => {
      const mocked = {
      useBulkActionsByTableType: vi.fn(() => []),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/components/user_privileges', () => {
      const mocked = {
      useUserPrivileges: vi.fn(() => ({
        timelinePrivileges: { read: true },
        notesPrivileges: { read: true },
        kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../notes/hooks/use_fetch_notes', () => {
      const mocked = {
      useFetchNotes: vi.fn(() => ({ onLoad: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../configurations/security_solution_detections/fetch_page_context', () => {
      const mocked = {
      useFetchUserProfilesFromAlerts: vi.fn(() => new Map()),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/trigger_actions_alert_table/use_cell_actions', () => {
      const mocked = {
      useCellActionsOptions: vi.fn(() => undefined),
    };
      return { ...mocked, default: mocked };
    });
vi.mock(
  '../../hooks/trigger_actions_alert_table/use_trigger_actions_browser_fields_options',
  () => {
      const mocked = {
        useAlertsTableFieldsBrowserOptions: vi.fn(() => undefined),
      };
      return { ...mocked, default: mocked };
    }
);
vi.mock('../../../common/hooks/use_invalid_filter_query', () => {
      const mocked = {
      useInvalidFilterQuery: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../common/lib/kuery', () => {
      const mocked = {
      combineQueries: vi.fn(() => null),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../configurations/security_solution_detections', () => {
      const mocked = {
      CellValue: () => null,
      getColumns: vi.fn(() => []),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../timelines/components/timeline/body/control_columns', () => {
      const mocked = {
      getDefaultControlColumn: vi.fn(() => [{ width: 124 }]),
    };
      return { ...mocked, default: mocked };
    });

const makeItem = (id: string): TimelineItem =>
  ({ _id: id, data: [], ecs: { _id: id, _index: '' } } as unknown as TimelineItem);

describe('Alerts Page Table — bulkAddToChatConfig', () => {
  let mockReportAddToChat: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReportAddToChat = vi.fn();
    (useReportAddToChat as Mock).mockReturnValue(mockReportAddToChat);
  });

  const renderAndGetBulkConfig = (tableType?: TableId) => {
    render(
      <TestProviders>
        <AlertsTable tableType={tableType} isLoading={false} />
      </TestProviders>
    );
    return (ResponseOpsAlertsTable as Mock).mock.calls[0][0].bulkAddToChatConfig;
  };

  it('passes BULK_ALERTS_ATTACHMENT_PROMPT as initialMessage', () => {
    const { initialMessage } = renderAndGetBulkConfig();
    expect(initialMessage).toBe(BULK_ALERTS_ATTACHMENT_PROMPT);
  });

  it('uses bulk_alerts_alerts_page pathway for the default alerts page table', () => {
    const { convertAlertToAttachment } = renderAndGetBulkConfig(TableId.alertsOnAlertsPage);
    const items = [makeItem('a'), makeItem('b')];
    convertAlertToAttachment(items);
    expect(mockReportAddToChat).toHaveBeenCalledWith({
      pathway: 'bulk_alerts_alerts_page',
      attachments: ['alert'],
      item_count: 2,
    });
  });

  it('uses bulk_alerts_rule_details pathway for the rule details table', () => {
    const { convertAlertToAttachment } = renderAndGetBulkConfig(TableId.alertsOnRuleDetailsPage);
    const items = [makeItem('a')];
    convertAlertToAttachment(items);
    expect(mockReportAddToChat).toHaveBeenCalledWith({
      pathway: 'bulk_alerts_rule_details',
      attachments: ['alert'],
      item_count: 1,
    });
  });

  it('delegates to alertsToAttachmentGroup and returns its result', () => {
    const mockGroup = { type: 'group', id: 'x', label: '1 Alert', items: [] };
    (alertsToAttachmentGroup as Mock).mockReturnValueOnce(mockGroup);
    const { convertAlertToAttachment } = renderAndGetBulkConfig();
    const items = [makeItem('a')];
    const result = convertAlertToAttachment(items);
    expect(alertsToAttachmentGroup).toHaveBeenCalledWith(items);
    expect(result).toEqual([mockGroup]);
  });
});
