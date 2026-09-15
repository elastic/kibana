/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import {
  INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID,
  InvestigationTimelineInlineContent,
  parseTimelineEvents,
  type InvestigationTimelineAttachment,
} from './investigation_timeline_inline_content';

const renderContent = (data: InvestigationTimelineAttachment['data']) => {
  const props = {
    attachment: {
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.investigationTimeline,
      data,
    },
    isSidebar: false,
  } as AttachmentRenderProps<InvestigationTimelineAttachment>;
  return render(
    <I18nProvider>
      <InvestigationTimelineInlineContent {...props} />
    </I18nProvider>
  );
};

describe('InvestigationTimelineInlineContent', () => {
  it('renders timestamp, host, and description for each event', () => {
    renderContent([
      {
        timestamp: '2026-09-11T14:23:32.488Z',
        host: 'WKSTN-RECV01',
        description: 'OUTLOOK.EXE spawned powershell.exe',
      },
      {
        timestamp: '2026-09-11T14:45:32.488Z',
        host: 'SRV-DC01',
        description: 'wmiprvse.exe spawned cmd.exe /c whoami',
      },
    ]);

    expect(screen.getByTestId(INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('WKSTN-RECV01')).toBeInTheDocument();
    expect(screen.getByText('SRV-DC01')).toBeInTheDocument();
    expect(screen.getByText('OUTLOOK.EXE spawned powershell.exe')).toBeInTheDocument();
    expect(screen.getByText('wmiprvse.exe spawned cmd.exe /c whoami')).toBeInTheDocument();
  });

  it('renders an empty state when there are no events', () => {
    renderContent([]);
    expect(
      screen.getByText('No events were reconstructed from the available telemetry.')
    ).toBeInTheDocument();
  });

  it('drops rows that are missing required fields', () => {
    expect(
      parseTimelineEvents([
        { timestamp: '2026-09-11T14:23:32.488Z', host: 'h', description: 'ok' },
        { timestamp: '2026-09-11T14:23:32.488Z', host: 'h' },
        'not-an-event',
      ])
    ).toEqual([{ timestamp: '2026-09-11T14:23:32.488Z', host: 'h', description: 'ok' }]);
  });
});
