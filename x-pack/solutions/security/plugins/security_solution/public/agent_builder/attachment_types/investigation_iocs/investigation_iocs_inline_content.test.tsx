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
} from './investigation_iocs_inline_content';
import type { InvestigationIocsAttachment, InvestigationIocsAttachmentData } from './types';

const LONG_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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

const expand = () => userEvent.click(screen.getByTestId('investigationIocsToggle'));

describe('InvestigationIocsInlineContent', () => {
  it('collapses to a summary of indicator and type counts by default', () => {
    renderContent({
      shas: [{ value: LONG_SHA }],
      ips: [{ value: '185.220.101.42:443' }, { value: '10.0.0.10' }],
    });

    expect(screen.getByTestId(INVESTIGATION_IOCS_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('investigationIocsSummary')).toHaveTextContent(
      'Indicators of compromise: 3 indicators across 2 types'
    );
    expect(screen.getByTestId('investigationIocsToggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('table', { hidden: true }).closest('[inert]')).not.toBeNull();
  });

  it('uses singular wording for one indicator of one type', () => {
    renderContent({ shas: [{ value: LONG_SHA }] });

    expect(screen.getByTestId('investigationIocsSummary')).toHaveTextContent(
      'Indicators of compromise: 1 indicator across 1 type'
    );
  });

  it('renders one row per filled category with a copyable badge per indicator once expanded', async () => {
    renderContent({
      shas: [{ value: 'abc123', comment: 'seen as dropped update.dll on WKSTN-RECV01' }],
      ips: [{ value: '185.220.101.42:443' }],
    });

    await expand();

    expect(screen.getByTestId('investigationIocsToggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('table').closest('[inert]')).toBeNull();
    expect(screen.getByText('IOC type')).toBeInTheDocument();
    expect(screen.getByText('SHA256')).toBeInTheDocument();
    expect(screen.getByText('IP addresses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy abc123' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy 185.220.101.42:443' })).toBeInTheDocument();
    expect(screen.queryByText('Ransom notes')).not.toBeInTheDocument();
  });

  it('shows the full value and its comment in the tooltip', async () => {
    renderContent({
      shas: [{ value: LONG_SHA, comment: 'seen as dropped update.dll on WKSTN-RECV01' }],
    });

    await expand();
    await userEvent.hover(screen.getByTestId('investigationIocBadge-0'));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(LONG_SHA);
    expect(tooltip).toHaveTextContent('seen as dropped update.dll on WKSTN-RECV01');
  });

  it('shows just the full value in the tooltip when there is no comment', async () => {
    renderContent({ shas: [{ value: LONG_SHA }] });

    await expand();
    await userEvent.hover(screen.getByTestId('investigationIocBadge-0'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(LONG_SHA);
  });

  it('renders an empty state when no category has indicators', () => {
    renderContent({});
    expect(
      screen.getByText('No indicators were extracted from the available telemetry.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('investigationIocsToggle')).not.toBeInTheDocument();
  });
});
