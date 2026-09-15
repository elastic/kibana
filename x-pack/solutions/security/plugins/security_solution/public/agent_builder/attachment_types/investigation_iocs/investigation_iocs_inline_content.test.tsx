/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import {
  INVESTIGATION_IOCS_ATTACHMENT_TEST_ID,
  InvestigationIocsInlineContent,
  parseIocCategoryRows,
  type InvestigationIocsAttachment,
  type InvestigationIocsAttachmentData,
} from './investigation_iocs_inline_content';

const renderContent = (data: InvestigationIocsAttachmentData) => {
  const props = {
    attachment: {
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.investigationIocs,
      data,
    },
    isSidebar: false,
  } as AttachmentRenderProps<InvestigationIocsAttachment>;
  return render(
    <I18nProvider>
      <InvestigationIocsInlineContent {...props} />
    </I18nProvider>
  );
};

describe('InvestigationIocsInlineContent', () => {
  it('renders one row per filled category with badges for each indicator', () => {
    renderContent({
      shas: [
        {
          value: 'abc123',
          comment: 'seen as dropped update.dll on WKSTN-RECV01',
        },
      ],
      ips: [{ value: '185.220.101.42:443' }],
    });

    expect(screen.getByTestId(INVESTIGATION_IOCS_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('IOC type')).toBeInTheDocument();
    expect(screen.getByText('SHA256')).toBeInTheDocument();
    expect(screen.getByText('IP addresses')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('185.220.101.42:443')).toBeInTheDocument();
    expect(screen.queryByText('Ransom notes')).not.toBeInTheDocument();
  });

  it('shows the indicator comment in a tooltip', async () => {
    const user = userEvent.setup();
    renderContent({
      shas: [{ value: 'abc123', comment: 'seen as dropped update.dll on WKSTN-RECV01' }],
    });

    await user.hover(screen.getByText('abc123'));
    expect(
      await screen.findByText('seen as dropped update.dll on WKSTN-RECV01')
    ).toBeInTheDocument();
  });

  it('renders an empty state when no category has indicators', () => {
    renderContent({});
    expect(
      screen.getByText('No indicators were extracted from the available telemetry.')
    ).toBeInTheDocument();
  });

  it('omits empty and malformed categories', () => {
    expect(
      parseIocCategoryRows({
        shas: [{ value: 'abc123' }],
        ips: [],
        file_paths: [{ value: '' }, 'nope'],
      })
    ).toEqual([
      {
        id: 'shas',
        typeLabel: 'SHA256',
        items: [{ value: 'abc123' }],
      },
    ]);
  });
});
