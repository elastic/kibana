/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { isString } from 'lodash/fp';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { UserPanelKey } from '../../../../../flyout/entity_details/shared/constants';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { UserDetailsLink } from '../../../../../common/components/links';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';

interface Props {
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  isButton?: boolean;
  onClick?: () => void;
  value: string | number | undefined | null;
  title?: string;
}

const UserNameComponent: React.FC<Props> = ({
  Component,
  contextId,
  isButton,
  onClick,
  title,
  value,
}) => {
  const eventContext = useContext(StatefulEventContext);
  const userName = `${value}`;
  const isInTimelineContext = userName && eventContext?.timelineID;
  const { openFlyout } = useExpandableFlyoutApi();

  const isInSecurityApp = useIsInSecurityApp();

  const openUserDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }

      if (!eventContext || !isInTimelineContext) {
        return;
      }

      const { timelineID } = eventContext;

      openFlyout({
        right: {
          id: UserPanelKey,
          params: {
            userName,
            contextID: contextId,
            scopeId: timelineID,
          },
        },
      });
    },
    [contextId, eventContext, isInTimelineContext, onClick, openFlyout, userName]
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
