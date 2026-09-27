/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { FlyoutSessionContextProvider } from '../../../flyout_v2/session_context';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { AttachmentSummaryFlyoutOpener } from './open_flyout_on_mount';

jest.mock('../../../flyout_v2/use_flyout_api');
jest.mock('../../../flyout_v2/shared/url_state/use_flyout_v2_restore');

// The real provider's companion hook reads Kibana services to pick a default history key; the
// point of this component is that it never falls back to that default, so the value it provides
// is what the test asserts.
jest.mock('../../../flyout_v2/session_context', () => ({
  FlyoutSessionContextProvider: jest.fn(({ children }) => <>{children}</>),
}));

// The real bundle mounts the whole Security provider stack; the opener only needs to be inside it.
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../data_view_manager/hooks/use_init_data_view_manager', () => ({
  useInitDataViewManager: () => jest.fn(),
}));
jest.mock('../../../data_view_manager/hooks/use_data_view_manager_status', () => ({
  useDataViewManagerStatus: () => 'ready',
}));
jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));

const attacksDataView = { getIndexPattern: () => '.attacks-*' };
jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: attacksDataView }),
}));

const alertAttachment: UnknownAttachment = {
  id: 'attachment-1',
  type: SecurityAgentBuilderAttachments.alert,
  data: { alert: JSON.stringify({ _id: ['alert-1'], _index: ['.internal.alerts-1'] }) },
};

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({
  store: {},
  kibanaServices: {},
});

const renderOpener = (attachment: UnknownAttachment) =>
  render(
    <AttachmentSummaryFlyoutOpener
      attachment={attachment}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );

describe('AttachmentSummaryFlyoutOpener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
  });

  it('opens the flyout the attachment resolves to, attributed to the summary', async () => {
    renderOpener(alertAttachment);

    await waitFor(() => expect(openDescriptorAsStart).toHaveBeenCalledTimes(1));
    expect(openDescriptorAsStart).toHaveBeenCalledWith(
      { kind: 'document', documentId: 'alert-1', indexName: '.internal.alerts-1' },
      {},
      expect.anything(),
      FLYOUT_ORIGIN.ATTACHMENT_SUMMARY
    );
  });

  it('renders nothing, because the row it is mounted into owns the presentation', async () => {
    const { container } = renderOpener(alertAttachment);

    await waitFor(() => expect(openDescriptorAsStart).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('opens nothing for an attachment that identifies no flyout', async () => {
    renderOpener({ ...alertAttachment, data: { alert: 'not json' } });

    await waitFor(() => expect(openDescriptorAsStart).not.toHaveBeenCalled());
  });

  it('opens on top of the investigation flyout, sharing its history group', async () => {
    // A child flyout would sit beside the investigation rather than over it, because EUI lays
    // child flyouts out side by side whenever the viewport has room. The history key is pinned
    // because the ambient default differs depending on whether this renders inside Security.
    renderOpener(alertAttachment);

    await waitFor(() => expect(FlyoutSessionContextProvider).toHaveBeenCalled());
    expect(FlyoutSessionContextProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        value: { session: 'start', historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY },
      }),
      expect.anything()
    );
  });
});
