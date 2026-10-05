/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { ConversationDetailsFlyoutOpener } from './flyout_opener';

jest.mock('../../../flyout_v2/use_flyout_api');
jest.mock('../../../flyout_v2/shared/url_state/use_flyout_v2_restore');

jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const initDataViewManager = jest.fn();
let dataViewStatus = 'ready';
jest.mock('../../../data_view_manager/hooks/use_init_data_view_manager', () => ({
  useInitDataViewManager: () => initDataViewManager,
}));
jest.mock('../../../data_view_manager/hooks/use_data_view_manager_status', () => ({
  useDataViewManagerStatus: () => dataViewStatus,
}));

const descriptor: FlyoutDescriptor = {
  kind: 'document',
  documentId: 'alert-1',
  indexName: '.internal.alerts-1',
};

const resolveSecurityCanvasContext = jest.fn().mockResolvedValue({ store: {}, kibanaServices: {} });
const resolveDescriptor = jest.fn().mockResolvedValue(descriptor);

const renderOpener = (
  overrides: { resolveDescriptor?: () => Promise<FlyoutDescriptor | null> } = {}
) =>
  render(
    <ConversationDetailsFlyoutOpener
      resolveDescriptor={overrides.resolveDescriptor ?? resolveDescriptor}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );

describe('ConversationDetailsFlyoutOpener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dataViewStatus = 'ready';
    jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
  });

  it('opens the flyout for the given descriptor, attributed to the attachment summary', async () => {
    renderOpener();

    await waitFor(() => expect(openDescriptorAsStart).toHaveBeenCalledTimes(1));
    expect(openDescriptorAsStart).toHaveBeenCalledWith(
      descriptor,
      {},
      expect.anything(),
      FLYOUT_ORIGIN.ATTACHMENT_SUMMARY
    );
  });

  it('initialises the data view manager when nothing else has', async () => {
    dataViewStatus = 'pristine';

    renderOpener();

    await waitFor(() => expect(initDataViewManager).toHaveBeenCalled());
  });

  it('does not retry after a failed initialisation, which would loop', async () => {
    dataViewStatus = 'error';

    renderOpener();

    await waitFor(() => expect(openDescriptorAsStart).toHaveBeenCalled());
    expect(initDataViewManager).not.toHaveBeenCalled();
  });

  it('does not open the flyout when the descriptor resolves to null', async () => {
    renderOpener({ resolveDescriptor: jest.fn().mockResolvedValue(null) });

    // Give it time to resolve.
    await new Promise((r) => setTimeout(r, 50));

    expect(openDescriptorAsStart).not.toHaveBeenCalled();
  });
});
