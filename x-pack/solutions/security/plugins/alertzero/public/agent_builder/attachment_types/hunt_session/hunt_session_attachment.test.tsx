/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createMockNavigation } from '../test_utils';
import { createHuntSessionAttachmentDefinition } from './hunt_session_attachment';
import { HuntSessionAttachmentInlineContent } from './hunt_session_inline_content';
import { automatedSession, manualSession } from './fixtures';

const mockContinueHunt = jest.fn();
jest.mock('./continue_hunt', () => ({
  continueHunt: (...args: unknown[]) => mockContinueHunt(...args),
}));

const navigation = (hasDiscover: boolean) => ({
  ...createMockNavigation(),
  share: hasDiscover
    ? ({ url: { locators: { get: () => ({ navigate: jest.fn() }) } } } as never)
    : undefined,
});

const definitionFor = (
  hasDiscover = true,
  notifications = { toasts: { addDanger: jest.fn() } }
) => ({
  notifications,
  definition: createHuntSessionAttachmentDefinition({
    http: httpServiceMock.createStartContract(),
    navigation: navigation(hasDiscover),
    notifications: notifications as never,
  }),
});

const attachment = (data: unknown) => ({ data } as never);

describe('createHuntSessionAttachmentDefinition', () => {
  beforeEach(() => mockContinueHunt.mockReset());

  it('labels the attachment with the hunt name and says who ran it', () => {
    const { definition } = definitionFor();

    expect(definition.getLabel(attachment(manualSession))).toBe('Failed OAuth public client scope');
    expect(definition.getHeader?.({ attachment: attachment(manualSession) } as never)).toEqual({
      icon: 'crosshair',
      subtitle: 'Analyst hunt',
    });
    expect(definition.getHeader?.({ attachment: attachment(automatedSession) } as never)).toEqual({
      icon: 'crosshair',
      subtitle: 'Automated hunt',
    });
  });

  it('falls back to a generic label and header for data it cannot read', () => {
    const { definition } = definitionFor();

    expect(definition.getLabel(attachment({ nope: true }))).toBe('Hunt session');
    expect(definition.getHeader?.({ attachment: attachment({ nope: true }) } as never)).toEqual({
      icon: 'crosshair',
    });
  });

  it('offers Continue hunt in Discover, which continues the recorded Investigation', async () => {
    const { definition } = definitionFor();

    const [button] = definition.getActionButtons!({
      attachment: attachment(manualSession),
    } as never);

    expect(button).toMatchObject({
      label: 'Continue hunt in Discover',
      type: ActionButtonType.PRIMARY,
      disabled: false,
    });
    await button.handler();
    expect(mockContinueHunt).toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: 'inv-1' })
    );
  });

  it('is offered for an automated session no human has extended', () => {
    const { definition } = definitionFor();

    const buttons = definition.getActionButtons!({
      attachment: attachment(automatedSession),
    } as never);

    expect(buttons).toHaveLength(1);
  });

  it('disables Continue, with the reason, when the session records no Investigation', () => {
    const { definition } = definitionFor();
    const { investigation_id: _omitted, ...withoutInvestigation } = manualSession;

    const [button] = definition.getActionButtons!({
      attachment: attachment(withoutInvestigation),
    } as never);

    expect(button.disabled).toBe(true);
    expect(button.disabledReason).toMatch(/cannot be continued/);
  });

  it('disables Continue when Discover is unavailable', () => {
    const { definition } = definitionFor(false);

    const [button] = definition.getActionButtons!({
      attachment: attachment(manualSession),
    } as never);

    expect(button.disabled).toBe(true);
  });

  it('offers no action for data it cannot read', () => {
    const { definition } = definitionFor();

    expect(definition.getActionButtons!({ attachment: attachment({ nope: 1 }) } as never)).toEqual(
      []
    );
  });

  it('says so, and does not throw, when continuing fails', async () => {
    mockContinueHunt.mockRejectedValue(new Error('403'));
    const { definition, notifications } = definitionFor();
    const [button] = definition.getActionButtons!({
      attachment: attachment(manualSession),
    } as never);

    await button.handler();

    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Unable to continue the hunt',
    });
  });
});

describe('HuntSessionAttachmentInlineContent', () => {
  const renderContent = (data: unknown) =>
    render(
      <I18nProvider>
        <HuntSessionAttachmentInlineContent attachment={attachment(data)} />
      </I18nProvider>
    );

  it('shows the hunt, who ran it, and each preservation with its query and rows', async () => {
    renderContent(manualSession);

    expect(screen.getByText('Failed OAuth public client scope')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroHuntTrigger')).toHaveTextContent('Analyst hunt');
    expect(screen.getByTestId('alertZeroHuntHypothesis')).toHaveTextContent(
      'An attacker probes OAuth scopes'
    );
    expect(screen.getByTestId('alertZeroHuntPreservation')).toHaveTextContent('2 rows');
    expect(screen.getByTestId('alertZeroHuntPreservation')).toHaveTextContent('analyst');
    await waitFor(() => expect(screen.getAllByText('logs-okta').length).toBeGreaterThan(0));
    expect(screen.getByText('FROM logs-okta | WHERE x')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroHuntAdjudication')).not.toBeInTheDocument();
  });

  it('shows the adjudication of an automated session', () => {
    renderContent(automatedSession);

    expect(screen.getByTestId('alertZeroHuntTrigger')).toHaveTextContent('Automated hunt');
    expect(screen.getByTestId('alertZeroHuntAdjudication')).toHaveTextContent(
      'Repeated denied scopes from one client'
    );
    expect(screen.getByText('Credential stuffing')).toBeInTheDocument();
    expect(screen.queryByText('Preserved evidence')).not.toBeInTheDocument();
  });

  it('marks an automated session a human has extended', () => {
    renderContent({
      ...automatedSession,
      has_manual_append: true,
      preservations: manualSession.preservations,
      resumeSnapshot: manualSession.resumeSnapshot,
    });

    expect(screen.getByText('Extended by an analyst')).toBeInTheDocument();
    expect(screen.getByText('Preserved evidence')).toBeInTheDocument();
  });

  it('warns instead of throwing when the stored data cannot be read', () => {
    renderContent({ nope: true });

    expect(screen.getByText('This hunt session cannot be shown')).toBeInTheDocument();
  });
});
