/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { TestProviders } from '../../../common/mock';
import { BULK_ALERTS_ATTACHMENT_PROMPT } from '../../../agent_builder/components/prompts';
import { alertsToAttachmentGroup } from '../../../agent_builder/helpers';
import { useReportAddToChat } from '../../../agent_builder/hooks/use_report_add_to_chat';
import { Table } from './table';

jest.mock('@kbn/response-ops-alerts-table', () => ({
  AlertsTable: jest.fn(() => null),
}));
jest.mock('../../../agent_builder/hooks/use_report_add_to_chat');
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(() => ({
    isAgentBuilderEnabled: true,
    hasAgentBuilderPrivilege: true,
    isAgentChatExperienceEnabled: true,
    hasValidAgentBuilderLicense: false,
  })),
}));
jest.mock('../../../agent_builder/helpers', () => ({
  alertsToAttachmentGroup: jest.fn(() => []),
}));
jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: jest.fn(() => ({})),
}));
jest.mock('../../../detections/hooks/alert_summary/use_additional_bulk_actions', () => ({
  useAdditionalBulkActions: jest.fn(() => []),
}));

const makeItem = (id: string): TimelineItem =>
  ({ _id: id, data: [], ecs: { _id: id, _index: '' } } as unknown as TimelineItem);

const dataView: DataView = createStubDataView({ spec: {} });
const packages: PackageListItem[] = [
  {
    id: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '0.1.0',
  },
];
const id = 'cases-table-test';
const query = { ids: { values: ['abc'] } };

describe('Cases Table — bulkAddToChatConfig', () => {
  let mockReportAddToChat: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReportAddToChat = jest.fn();
    (useReportAddToChat as jest.Mock).mockReturnValue(mockReportAddToChat);
  });

  const renderAndGetBulkConfig = () => {
    render(
      <TestProviders>
        <Table dataView={dataView} id={id} packages={packages} query={query} />
      </TestProviders>
    );
    return (AlertsTable as jest.Mock).mock.calls[0][0].bulkAddToChatConfig;
  };

  it('passes BULK_ALERTS_ATTACHMENT_PROMPT as initialMessage', () => {
    const { initialMessage } = renderAndGetBulkConfig();
    expect(initialMessage).toBe(BULK_ALERTS_ATTACHMENT_PROMPT);
  });

  it('calls reportAddToChat with bulk_alerts_cases pathway and item_count', () => {
    const { convertAlertToAttachment } = renderAndGetBulkConfig();
    const items = [makeItem('a'), makeItem('b')];
    convertAlertToAttachment(items);
    expect(mockReportAddToChat).toHaveBeenCalledWith({
      pathway: 'bulk_alerts_cases',
      attachments: ['alert'],
      item_count: 2,
    });
  });

  it('delegates to alertsToAttachmentGroup and returns its result', () => {
    const mockGroup = { type: 'group', id: 'x', label: '1 Alert', items: [] };
    (alertsToAttachmentGroup as jest.Mock).mockReturnValueOnce(mockGroup);
    const { convertAlertToAttachment } = renderAndGetBulkConfig();
    const items = [makeItem('a')];
    const result = convertAlertToAttachment(items);
    expect(alertsToAttachmentGroup).toHaveBeenCalledWith(items);
    expect(result).toEqual([mockGroup]);
  });
});
