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
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { UserPanelKey } from '../../flyout/entity_details/shared/constants';

interface Props {
  userName: string | undefined | null;
  contextId?: string;
  scopeId: string;
}

const UserNameComponent: React.FC<Props> = ({ userName, scopeId, contextId }) => {
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openFlyout } = useExpandableFlyoutApi();
  const { openUserFlyout } = useFlyoutApi();

  const openUserDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      if (enableNewFlyout) {
        openUserFlyout({
          userName: userName ?? '',
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
        });
        return;
      }

      openFlyout({
        right: {
          id: UserPanelKey,
          params: { userName: userName ?? undefined, contextID: contextId, scopeId },
        },
      });
    },
    [contextId, enableNewFlyout, openFlyout, openUserFlyout, scopeId, userName]
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
