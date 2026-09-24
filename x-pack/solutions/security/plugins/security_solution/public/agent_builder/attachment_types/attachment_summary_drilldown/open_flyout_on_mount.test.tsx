/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { AttachmentSummaryFlyoutOpener } from './open_flyout_on_mount';

jest.mock('../../../flyout_v2/use_flyout_api');
jest.mock('../../../flyout_v2/shared/url_state/use_flyout_v2_restore');

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

const alertAttachment: UnknownAttachment = {
  id: 'attachment-1',
  type: SecurityAgentBuilderAttachments.alert,
  data: { alert: JSON.stringify({ _id: ['alert-1'], _index: ['.internal.alerts-1'] }) },
};

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({ store: {}, kibanaServices: {} });

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

    await waitFor(() => expect(resolveSecurityCanvasContext).toHaveBeenCalled());
    expect(openDescriptorAsStart).not.toHaveBeenCalled();
  });
});
