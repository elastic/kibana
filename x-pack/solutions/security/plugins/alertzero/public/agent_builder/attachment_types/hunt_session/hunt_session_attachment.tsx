/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { ALERTZERO_APP_ID } from '../../../../common/constants';
import { HUNT_LIBRARY_PATH } from '../../../pages/hunt_library/paths';
import { huntSessionAttachmentSchema } from '../../../../common/hunt_session_attachment_schema';
import type { AttachmentNavigationDeps } from '../navigation';
import { lazyInlineContent } from '../shared/attachment_definition_helpers';
import { continueHunt } from './continue_hunt';
import type { HuntSessionAttachmentInlineContentProps } from './hunt_session_inline_content';
import * as i18n from './translations';

const LazyHuntSessionInlineContent = lazyInlineContent<HuntSessionAttachmentInlineContentProps>(
  () =>
    import(
      /* webpackChunkName: "alertzero_hunt_session_attachment_inline" */
      './hunt_session_inline_content'
    ).then((m) => ({ default: m.HuntSessionAttachmentInlineContent })),
  3
);

type HuntSessionUiAttachment = Parameters<
  NonNullable<AttachmentUIDefinition['getActionButtons']>
>[0]['attachment'];

/**
 * Builds the `security.hunt_session` `AttachmentUIDefinition`: the hunt, how it was run and the evidence
 * preserved from it, with an action that reopens the hunt in Discover at the saved state.
 */
export const createHuntSessionAttachmentDefinition = ({
  http,
  navigation,
  notifications,
}: {
  http: HttpStart;
  navigation: AttachmentNavigationDeps;
  notifications?: NotificationsStart;
}): AttachmentUIDefinition<HuntSessionUiAttachment> => ({
  getLabel: (attachment) => {
    const parsed = huntSessionAttachmentSchema.safeParse(attachment?.data);
    return parsed.success ? parsed.data.definition.name : i18n.DEFAULT_LABEL;
  },
  getIcon: () => 'crosshair',
  getHeader: ({ attachment }) => {
    const parsed = huntSessionAttachmentSchema.safeParse(attachment?.data);
    return {
      icon: 'crosshair',
      ...(parsed.success
        ? {
            subtitle:
              parsed.data.trigger === 'manual' ? i18n.TRIGGER_MANUAL : i18n.TRIGGER_AUTOMATED,
          }
        : {}),
    };
  },
  renderInlineContent: ({ attachment }) => {
    const parsed = huntSessionAttachmentSchema.safeParse(attachment?.data);
    const huntLibraryUrl =
      parsed.success && navigation.getUrlForApp
        ? navigation.getUrlForApp(ALERTZERO_APP_ID, {
            path: `${HUNT_LIBRARY_PATH}?hunt=${encodeURIComponent(parsed.data.definition.id)}`,
            absolute: true,
          })
        : undefined;
    return <LazyHuntSessionInlineContent attachment={attachment} huntLibraryUrl={huntLibraryUrl} />;
  },
  getActionButtons: ({ attachment }) => {
    const parsed = huntSessionAttachmentSchema.safeParse(attachment?.data);
    const investigationId = parsed.success ? parsed.data.investigation_id : undefined;
    const hasDiscover = Boolean(navigation.share?.url.locators.get('DISCOVER_APP_LOCATOR'));
    if (!parsed.success) return [];

    return [
      {
        label: i18n.CONTINUE_HUNT,
        icon: 'discoverApp',
        type: ActionButtonType.PRIMARY,
        disabled: !investigationId || !hasDiscover,
        ...(!investigationId ? { disabledReason: i18n.CONTINUE_UNAVAILABLE } : {}),
        handler: async () => {
          if (!investigationId) return;
          try {
            await continueHunt({ http, share: navigation.share, investigationId });
          } catch {
            notifications?.toasts.addDanger({ title: i18n.CONTINUE_FAILED });
          }
        },
      },
    ];
  },
});
