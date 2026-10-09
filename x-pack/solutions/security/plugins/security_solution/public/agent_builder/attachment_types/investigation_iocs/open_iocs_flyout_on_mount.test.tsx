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
import { InvestigationIocsFlyoutOpener } from './open_iocs_flyout_on_mount';

let mockPinnedSessionSize: number | string | undefined;

jest.mock('../../../flyout_v2/shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: jest.fn(),
}));
jest.mock('../../../flyout_v2/session_context', () => {
  const { createContext: createSessionContext, useContext: useSessionContext } = jest.requireActual(
    'react'
  ) as typeof import('react');
  const fallbackKey = Symbol.for('investigation-iocs-flyout-test-fallback');
  const SessionContext = createSessionContext<{
    session: 'start' | 'inherit';
    historyKey?: symbol;
    isChildFlyout?: boolean;
    size?: number | string;
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
      value: {
        session: 'start' | 'inherit';
        historyKey?: symbol;
        isChildFlyout?: boolean;
        size?: number | string;
      };
      children: React.ReactNode;
    }) => {
      mockPinnedSessionSize = value.size;
      return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
    },
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

const categories = [
  {
    id: 'shas' as const,
    typeLabel: 'SHA256',
    items: [{ value: 'abc123' }],
  },
];

describe('InvestigationIocsFlyoutOpener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPinnedSessionSize = undefined;
    document.body.innerHTML = '';
    jest.mocked(useOpenFlyout).mockReturnValue(openFlyout);
  });

  it('opens a system flyout for the indicators, attributed to the summary', async () => {
    render(
      <InvestigationIocsFlyoutOpener
        categories={categories}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        paddingSize: 'l',
        title: 'IOCs',
        session: 'start',
        resizable: true,
        type: 'push',
        historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
      }),
      expect.objectContaining({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_IOCS,
        session: 'start',
        origin: FLYOUT_ORIGIN.ATTACHMENTS_OVERVIEW,
      })
    );
    expect(openFlyout.mock.calls[0][1]).not.toHaveProperty('flyoutMenuProps');
    expect(openFlyout.mock.calls[0][1]).not.toHaveProperty('maxWidth');
    expect(mockPinnedSessionSize).toBeUndefined();
  });

  it('opens at the measured conversation flyout width', async () => {
    const flyout = document.createElement('div');
    flyout.setAttribute('data-test-subj', 'agentBuilderConversationDetailsFlyout-live');
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
      <InvestigationIocsFlyoutOpener
        categories={categories}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    expect(mockPinnedSessionSize).toBe(640);
  });
});
