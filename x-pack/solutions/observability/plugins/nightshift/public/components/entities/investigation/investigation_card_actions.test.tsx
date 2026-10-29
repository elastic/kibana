/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { copyToClipboard } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { InvestigationCardActions } from './investigation_card_actions';

const openChat = jest.fn();
const getChatHref = jest.fn(
  (id: string, agentId?: string) => `/mock/chat/${agentId ?? 'none'}/${id}`
);
const addSuccess = jest.fn();

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  useOpenInChat: () => ({ getChatHref, openChat }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addSuccess } },
    },
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(() => true),
  };
});

const investigation: InvestigationSummary = {
  id: 'investigation-1',
  title: 'Checkout errors',
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout errors are elevated' },
  in_progress: false,
  subjects: [],
};

const renderActions = () =>
  render(
    <I18nProvider>
      <InvestigationCardActions investigation={investigation} />
    </I18nProvider>
  );

describe('InvestigationCardActions', () => {
  beforeEach(() => {
    openChat.mockReset();
    getChatHref.mockClear();
    addSuccess.mockReset();
    (copyToClipboard as jest.Mock).mockReturnValue(true);
  });

  it('opens the investigation chat when the robot control is clicked', () => {
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardOpenInChat'));

    expect(openChat).toHaveBeenCalledWith('investigation-1', 'nightshift.investigation');
  });

  it('copies the Nightshift flyout share URL from the overflow menu', () => {
    renderActions();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardActions'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationCardCopyLink'));

    expect(copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('investigationId=investigation-1')
    );
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Copied link to clipboard' })
    );
  });
});
