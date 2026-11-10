/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { UserDetailsLink } from '../../common/components/links';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

interface Props {
  userName: string | undefined | null;
  contextId?: string;
  scopeId: string;
}

const UserNameComponent: React.FC<Props> = ({ userName, scopeId, contextId }) => {
  const { openUserFlyout } = useFlyoutApi();

  const openUserDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      openUserFlyout({
        userName: userName ?? '',
        scopeId,
        contextID: contextId,
        origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
      });
    },
    [contextId, openUserFlyout, scopeId, userName]
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
