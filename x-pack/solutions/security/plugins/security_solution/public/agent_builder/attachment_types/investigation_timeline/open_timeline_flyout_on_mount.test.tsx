/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { FLYOUT_ORIGIN, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import { InvestigationTimelineFlyoutOpener } from './open_timeline_flyout_on_mount';

jest.mock('../../../flyout_v2/shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: jest.fn(),
}));
jest.mock('../../../flyout_v2/session_context', () => {
  const { createContext: createSessionContext, useContext: useSessionContext } = jest.requireActual(
    'react'
  ) as typeof import('react');
  const fallbackKey = Symbol.for('investigation-timeline-flyout-test-fallback');
  const SessionContext = createSessionContext<{
    session: 'start' | 'inherit';
    historyKey?: symbol;
    isChildFlyout?: boolean;
  }>({
    session: 'inherit',
    historyKey: fallbackKey,
    isChildFlyout: false,
  });
  return {
    FlyoutSessionContextProvider: ({
      value,
      children,
    }: {
      value: { session: 'start' | 'inherit'; historyKey?: symbol; isChildFlyout?: boolean };
      children: React.ReactNode;
    }) => <SessionContext.Provider value={value}>{children}</SessionContext.Provider>,
    useFlyoutSessionContext: () => useSessionContext(SessionContext),
  };
});
jest.mock('../../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({ size: 's' }),
}));
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({ store: {}, kibanaServices: {} });
const openFlyout = jest.fn((_content: React.ReactNode, _options?: object) => ({
  close: jest.fn(),
  onClose: Promise.resolve(),
}));

const events = [
  {
    timestamp: '2026-09-11T14:23:32.488Z',
    host: 'WKSTN-RECV01',
    description: 'OUTLOOK.EXE spawned powershell.exe',
  },
];

describe('InvestigationTimelineFlyoutOpener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useOpenFlyout).mockReturnValue(openFlyout);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens a system flyout for the timeline, attributed to the summary', async () => {
    render(
      <InvestigationTimelineFlyoutOpener
        events={events}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        size: 's',
        paddingSize: 'l',
        title: 'Investigation timeline',
        session: 'start',
        maxWidth: false,
        resizable: true,
        type: 'push',
        historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
      }),
      expect.objectContaining({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_TIMELINE,
        session: 'start',
        origin: FLYOUT_ORIGIN.ATTACHMENTS_OVERVIEW,
      }),
      undefined,
      { persistWidth: false }
    );
    expect(openFlyout.mock.calls[0][1]).not.toHaveProperty('flyoutMenuProps');
  });

  it('opens at the conversation flyout width', async () => {
    const flyout = document.createElement('div');
    flyout.setAttribute('data-test-subj', 'agentBuilderConversationDetailsFlyout-snapshot');
    jest.spyOn(flyout, 'getBoundingClientRect').mockReturnValue({
      width: 640,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(flyout);

    render(
      <InvestigationTimelineFlyoutOpener
        events={events}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ size: 640, type: 'push', session: 'start' }),
      expect.anything(),
      undefined,
      { persistWidth: false }
    );
  });
});
