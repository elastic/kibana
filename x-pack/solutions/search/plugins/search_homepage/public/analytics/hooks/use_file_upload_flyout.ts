/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { OPEN_FILE_UPLOAD_LITE_ACTION } from '@kbn/file-upload-common';
import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import { OPEN_FILE_UPLOAD_LITE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { useKibana } from '../../hooks/use_kibana';
import { useRefetchAnalyticsClusterState } from './use_analytics_cluster_state';

/** Names this page in the file upload telemetry. */
export const FILE_UPLOAD_LOCATION = 'search-homepage';

export interface FileUploadFlyoutApi {
  /** False where no plugin has registered the file upload flyout. */
  isAvailable: boolean;
  /**
   * Opens the flyout over this page; `opener` gets the focus back when it closes.
   * Rejects when the flyout could not be opened.
   */
  open: (opener?: HTMLElement | null) => Promise<void>;
}

/** The shared file upload flyout, which uploads a file to a new index without leaving the page. */
export const useFileUploadFlyout = (): FileUploadFlyoutApi => {
  const { uiActions } = useKibana().services;
  const refetchClusterState = useRefetchAnalyticsClusterState();

  return useMemo(() => {
    if (uiActions === undefined || !uiActions.hasAction(OPEN_FILE_UPLOAD_LITE_ACTION)) {
      return {
        isAvailable: false,
        open: () => Promise.reject(new Error('The file upload flyout is not available')),
      };
    }

    return {
      isAvailable: true,
      open: (opener) => {
        // The flyout returns the focus to whatever held it when it opened.
        opener?.focus();
        const context: OpenFileUploadLiteContext = {
          location: FILE_UPLOAD_LOCATION,
          // Called when a flyout that uploaded something closes.
          onUploadComplete: refetchClusterState,
        };
        return uiActions.executeTriggerActions(OPEN_FILE_UPLOAD_LITE_TRIGGER, context);
      },
    };
  }, [uiActions, refetchClusterState]);
};
