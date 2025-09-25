/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  type PageAttachmentPersistedState,
  PAGE_ATTACHMENT_TYPE,
} from '@kbn/page-attachment-schema';
import { EuiLoadingSpinner } from '@elastic/eui';
import {
  type PersistableStateAttachmentType,
  type PersistableStateAttachmentViewProps,
  type AttachmentViewObject,
  type AttachmentAction,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { AttachmentActionType } from '@kbn/cases-plugin/public';
import * as i18n from './translations';

const AttachmentChildrenLazy = React.lazy(() => import('./attachment_children'));
const GoToAction = React.lazy(() => import('./go_to_action'));

const getPageAttachmentViewObject =
  (): AttachmentViewObject<PersistableStateAttachmentViewProps> => {
    return {
      event: i18n.ADDED_PAGE,
      timelineAvatar: 'link',
      hideDefaultActions: false,
      children: AttachmentChildrenLazy,
      getActions: (props: PersistableStateAttachmentViewProps) =>
        getPageAttachmentActions(
          props.persistableStateAttachmentState as PageAttachmentPersistedState
        ),
    };
  };

export const getPageAttachmentType = (): PersistableStateAttachmentType => ({
  id: PAGE_ATTACHMENT_TYPE,
  icon: 'link',
  displayName: i18n.PAGE_LABEL,
  getAttachmentViewObject: getPageAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_PAGE }),
});

const getPageAttachmentActions = (state: PageAttachmentPersistedState): AttachmentAction[] => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getGoToAction({ state }),
    isPrimary: true,
  },
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getGoToAction({ state }),
    isPrimary: false,
  },
];

function getGoToAction({ state }: { state: PageAttachmentPersistedState }) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <GoToAction state={state} />
    </Suspense>
  );
}
