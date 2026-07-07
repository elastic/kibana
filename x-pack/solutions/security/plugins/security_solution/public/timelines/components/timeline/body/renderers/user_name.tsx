/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useCallback, useContext, useMemo } from 'react';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { isString } from 'lodash/fp';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { UserPanelKey } from '../../../../../flyout/entity_details/shared/constants';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { UserDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana, useUiSetting } from '../../../../../common/lib/kibana';
import { useEntityFromStore } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { flyoutProviders } from '../../../../../flyout_v2/shared/components/flyout_provider';
import { FlyoutLoading } from '../../../../../flyout_v2/shared/components/flyout_loading';
import { useDefaultDocumentFlyoutProperties } from '../../../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../../../flyout_v2/shared/constants/flyout_history';

// Lazy-loaded to keep the heavy v2 entity flyout out of the timeline row renderer's static import
// graph, which would otherwise create a require cycle back through the row renderers barrel.
const User = lazy(() =>
  import('../../../../../flyout_v2/entity/user/main').then((module) => ({ default: module.User }))
);

interface Props {
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  isButton?: boolean;
  onClick?: () => void;
  value: string | number | undefined | null;
  title?: string;
  entityId?: string;
}

const UserNameComponent: React.FC<Props> = ({
  Component,
  contextId,
  isButton,
  onClick,
  title,
  value,
  entityId,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const eventContext = useContext(StatefulEventContext);
  const userName = `${value}`;
  const isInTimelineContext = userName && eventContext?.timelineID;
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);

  const { entityRecord } = useEntityFromStore({
    entityId,
    entityType: 'user',
    skip: !entityStoreV2Enabled,
  });

  const resolvedEntityId = entityRecord?.entity?.id;

  const openUserDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }

      if (!eventContext || !isInTimelineContext) {
        return;
      }

      if (newFlyoutSystemEnabled) {
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <Suspense fallback={<FlyoutLoading />}>
                <User userName={userName} entityId={resolvedEntityId} />
              </Suspense>
            ),
          }),
          { ...defaultDocumentFlyoutProperties, historyKey, session: 'start' }
        );
      } else {
        const { timelineID } = eventContext;
        openFlyout({
          right: {
            id: UserPanelKey,
            params: {
              userName,
              entityId: resolvedEntityId,
              contextID: contextId,
              scopeId: timelineID,
            },
          },
        });
      }
    },
    [
      contextId,
      eventContext,
      isInTimelineContext,
      onClick,
      openFlyout,
      userName,
      resolvedEntityId,
      newFlyoutSystemEnabled,
      overlays,
      services,
      store,
      history,
      historyKey,
      defaultDocumentFlyoutProperties,
    ]
  );

  // The below is explicitly defined this way as the onClick takes precedence when it and the href are both defined
  // When this component is used outside of timeline/alerts table (i.e. in the flyout) we would still like it to link to the User Details page
  const content = useMemo(
    () => (
      <UserDetailsLink
        Component={Component}
        userName={userName}
        isButton={isButton}
        onClick={isInTimelineContext || !isInSecurityApp ? openUserDetailsSidePanel : undefined}
        title={title}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">{userName}</TruncatableText>
      </UserDetailsLink>
    ),
    [
      userName,
      isButton,
      isInTimelineContext,
      openUserDetailsSidePanel,
      Component,
      title,
      isInSecurityApp,
    ]
  );

  return isString(value) && userName.length > 0 ? content : getEmptyTagValue();
};

export const UserName = React.memo(UserNameComponent);
UserName.displayName = 'UserName';
