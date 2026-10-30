/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FlyoutV2DocViewerStateSync } from './flyout_v2_doc_viewer_state_sync';

const mockUseIsInSecurityApp = jest.fn();
jest.mock('../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: () => mockUseIsInSecurityApp(),
}));

const mockUseFlyoutV2DocViewerState = jest.fn();
jest.mock('../flyout_v2/shared/url_state/use_flyout_v2_doc_viewer_state', () => ({
  useFlyoutV2DocViewerState: (params: unknown) => mockUseFlyoutV2DocViewerState(params),
}));

const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;

describe('FlyoutV2DocViewerStateSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs the doc view state outside the Security app', () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const onInitialStateChange = jest.fn();
    const initialState = { flyoutV2: [{ kind: 'host' as const, hostName: 'web-01' }] };

    render(
      <FlyoutV2DocViewerStateSync
        hit={hit}
        initialState={initialState}
        onInitialStateChange={onInitialStateChange}
      />
    );

    expect(mockUseFlyoutV2DocViewerState).toHaveBeenCalledWith({
      hit,
      initialState,
      onInitialStateChange,
    });
  });

  it('leaves the flyouts to the flyoutV2 URL param inside the Security app', () => {
    mockUseIsInSecurityApp.mockReturnValue(true);

    render(<FlyoutV2DocViewerStateSync hit={hit} />);

    expect(mockUseFlyoutV2DocViewerState).not.toHaveBeenCalled();
  });
});
