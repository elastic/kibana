/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useFlyoutSessionContext } from '../../../flyout_v2/session_context';
import { ConversationFlyoutHost } from './conversation_flyout_host';

// Agent Builder and AlertZero render outside the Security app, where the ambient history key
// would otherwise fall back to Discover's doc viewer key.
jest.mock('../../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: () => false,
}));

// The real bundle mounts the whole Security provider stack; only the session context matters here.
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({ store: {}, kibanaServices: {} });

describe('ConversationFlyoutHost', () => {
  it('scopes the flyouts it hosts to the conversation details history key', async () => {
    let historyKey: symbol | undefined;
    const SessionProbe = () => {
      ({ historyKey } = useFlyoutSessionContext());
      return null;
    };

    render(
      <ConversationFlyoutHost resolveSecurityCanvasContext={resolveSecurityCanvasContext}>
        <SessionProbe />
      </ConversationFlyoutHost>
    );

    // Falling back to the doc viewer key would route the chain into Discover's doc viewer state.
    await waitFor(() => expect(historyKey).toBe(CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY));
    expect(historyKey).not.toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
