/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseFlyoutV2DocViewerStateParams } from '../flyout_v2/shared/url_state/use_flyout_v2_doc_viewer_state';
import { useFlyoutV2DocViewerState } from '../flyout_v2/shared/url_state/use_flyout_v2_doc_viewer_state';
import { useIsInSecurityApp } from '../common/hooks/is_in_security_app';

const DocViewerStateSync = (params: UseFlyoutV2DocViewerStateParams) => {
  useFlyoutV2DocViewerState(params);
  return null;
};

/**
 * Syncs the flyouts opened from a Security overview tab in Discover's doc viewer with the doc view
 * state, so Discover can deep-link them. Inside the Security app the flyouts keep using the
 * `flyoutV2` URL param instead. Render it inside the flyout providers.
 */
export const FlyoutV2DocViewerStateSync = (params: UseFlyoutV2DocViewerStateParams) => {
  const isInSecurityApp = useIsInSecurityApp();

  return isInSecurityApp ? null : <DocViewerStateSync {...params} />;
};
