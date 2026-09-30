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
import { InvestigationIocsFlyoutOpener } from './open_iocs_flyout_on_mount';

jest.mock('../../../flyout_v2/shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: jest.fn(),
}));
jest.mock('../../../flyout_v2/session_context', () => ({
  useFlyoutSessionContext: () => ({
    session: 'start',
    historyKey: Symbol.for('investigation-iocs-flyout-test'),
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

const categories = [
  {
    id: 'shas' as const,
    typeLabel: 'SHA256',
    shortLabel: 'SHAs',
    items: [{ value: 'abc123' }],
  },
];

describe('InvestigationIocsFlyoutOpener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        size: 's',
        paddingSize: 'l',
        title: 'IOCs',
        session: 'start',
      }),
      expect.objectContaining({
        surface: FLYOUT_SURFACE.FLYOUT,
        flyoutType: FLYOUT_TYPE.INVESTIGATION_IOCS,
        session: 'start',
        origin: FLYOUT_ORIGIN.ATTACHMENT_SUMMARY,
      })
    );
  });
});
