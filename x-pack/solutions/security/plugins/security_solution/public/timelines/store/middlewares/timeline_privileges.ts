/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { State } from '../../../common/store/types';

import { showTimeline } from '../actions';
import { extractTimelineCapabilities } from '../../../common/utils/timeline_capabilities';

function isShowTimelineAction(action: Action): action is ReturnType<typeof showTimeline> {
  return action.type === showTimeline.type;
}

export const timelinePrivilegesMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    const { read: hasAccessToTimeline } = extractTimelineCapabilities(
      kibana.application.capabilities
    );

    if (isShowTimelineAction(action) && action.payload.show && !hasAccessToTimeline) {
      kibana.notifications.toasts.addWarning({
        title: i18n.translate(
          'xpack.securitySolution.timeline.toast.insufficientPrivileges.title',
          {
            defaultMessage: 'Insufficient privileges (timeline)',
          }
        ),
        text: i18n.translate('xpack.securitySolution.timeline.toast.insufficientPrivileges.text', {
          defaultMessage:
            'You are trying to open a timeline but you do not have sufficient privileges. Please contact your administrator in order to get set up with the correct privileges for timeline.',
        }),
      });
      return next(showTimeline({ id: action.payload.id, show: false }));
    } else {
      return next(action);
    }
  };
