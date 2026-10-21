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
import { copyLink } from './copy_link';
import type { UiErrorSurface } from '../../telemetry';
import { useReportToastError } from '../../telemetry';

/**
 * Copies an app link that opens the given conversation's details flyout, and returns whether it
 * worked. Shared by the card menu and the flyout's trailing action, so both build the link
 * identically; each confirms success its own way. `surface` names the control in telemetry when
 * the copy fails.
 */
export const useCopyInvestigationLink = (
  surface: Extract<UiErrorSurface, 'queue' | 'flyout'>
): ((conversationId: string) => boolean) => {
  const {
    services: { application, notifications },
  } = useKibana<CoreStart>();
  const reportShown = useReportToastError(surface);

  return useCallback(
    (conversationId: string) => {
      const link = application.getUrlForApp(ALERTZERO_APP_ID, {
        path: `?${SELECTED_CONVERSATION_ID_PARAM}=${encodeURIComponent(conversationId)}`,
        absolute: true,
      });
      return copyLink(notifications?.toasts, link, () => reportShown('clipboard'));
    },
    [application, notifications, reportShown]
  );
};
