/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ALERTZERO_APP_ID } from '../../../common/constants';
import { SELECTED_CONVERSATION_ID_PARAM } from './conversations_url_params';
import { copyLinkWithToast } from './copy_link';

/**
 * Copies an app link that opens the given conversation's details flyout. Shared by the card menu
 * and the flyout's trailing action, so both build and report the copy identically.
 */
export const useCopyInvestigationLink = (): ((conversationId: string) => void) => {
  const {
    services: { application, notifications },
  } = useKibana<CoreStart>();

  return useCallback(
    (conversationId: string) => {
      const link = application.getUrlForApp(ALERTZERO_APP_ID, {
        path: `?${SELECTED_CONVERSATION_ID_PARAM}=${encodeURIComponent(conversationId)}`,
        absolute: true,
      });
      copyLinkWithToast(notifications?.toasts, link);
    },
    [application, notifications]
  );
};
