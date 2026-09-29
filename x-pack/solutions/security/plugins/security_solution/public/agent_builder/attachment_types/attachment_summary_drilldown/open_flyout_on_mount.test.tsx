/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { openDescriptorAsStart } from '../../../flyout_v2/shared/url_state/use_flyout_v2_restore';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { AttachmentSummaryFlyoutOpener } from './open_flyout_on_mount';

vi.mock('../../../flyout_v2/use_flyout_api');
vi.mock('../../../flyout_v2/shared/url_state/use_flyout_v2_restore');

// The real bundle mounts the whole Security provider stack; the opener only needs to be inside it.
vi.mock('../../../flyout_v2/shared/components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
const initDataViewManager = vi.fn();
let dataViewStatus = 'ready';
vi.mock('../../../data_view_manager/hooks/use_init_data_view_manager', () => {
  const mocked = {
    useInitDataViewManager: () => initDataViewManager,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../data_view_manager/hooks/use_data_view_manager_status', () => {
  const mocked = {
    useDataViewManagerStatus: () => dataViewStatus,
  };
  return { ...mocked, default: mocked };
});

const descriptor: FlyoutDescriptor = {
  kind: 'document',
  documentId: 'alert-1',
  indexName: '.internal.alerts-1',
};

const resolveSecurityCanvasContext = vi.fn().mockResolvedValue({ store: {}, kibanaServices: {} });

const renderOpener = (d: FlyoutDescriptor = descriptor) =>
  render(
    <AttachmentSummaryFlyoutOpener
      descriptor={d}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  );

describe('AttachmentSummaryFlyoutOpener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataViewStatus = 'ready';
    vi.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
  });

  it('opens the flyout for the given descriptor, attributed to the summary', async () => {
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
});
