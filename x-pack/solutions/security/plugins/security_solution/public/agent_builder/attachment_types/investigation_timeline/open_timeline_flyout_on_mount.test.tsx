/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { FLYOUT_ORIGIN, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../../common/lib/telemetry';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import { InvestigationTimelineFlyoutOpener } from './open_timeline_flyout_on_mount';

jest.mock('../../../flyout_v2/shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: jest.fn(),
}));
jest.mock('../../../flyout_v2/session_context', () => ({
  useFlyoutSessionContext: () => ({
    session: 'start',
    historyKey: Symbol.for('investigation-timeline-flyout-test'),
    isChildFlyout: false,
  }),
}));
jest.mock('../../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({ size: 's' }),
}));
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({ store: {}, kibanaServices: {} });
const openFlyout = jest.fn();

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

  it('opens a system flyout for the timeline, attributed to the summary', async () => {
    render(
      <InvestigationTimelineFlyoutOpener
        title="Investigation timeline"
        events={events}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    );

    await waitFor(() => expect(openFlyout).toHaveBeenCalledTimes(1));
    expect(openFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        size: 's',
        title: 'Investigation timeline',
        session: 'start',
      }),
      expect.objectContaining({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_TIMELINE,
        session: 'start',
        origin: FLYOUT_ORIGIN.ATTACHMENT_SUMMARY,
      })
    );
  });
});
