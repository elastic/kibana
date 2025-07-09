/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { UserDetailsLink } from '../../common/components/links';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { UserPanelKey } from '../../flyout/entity_details/shared/constants';

interface Props {
  userName: string | undefined | null;
  contextId?: string;
  scopeId: string;
}

const UserNameComponent: React.FC<Props> = ({ userName, scopeId, contextId }) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openUserDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      openFlyout({
        right: {
          id: UserPanelKey,
          params: {
            userName,
            contextID: contextId,
            scopeId,
          },
        },
      });
    },
    [contextId, openFlyout, scopeId, userName]
  );

  if (!userName) {
    return getEmptyTagValue();
  }

  return (
    <UserDetailsLink userName={userName} onClick={openUserDetailsSidePanel}>
      {userName}
    </UserDetailsLink>
  );
};

export const UserName = React.memo(UserNameComponent);
UserName.displayName = 'UserName';
