/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiAvatar, EuiTimelineItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import moment from 'moment';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { DATE_DISPLAY_FORMAT, DATE_DISPLAY_FORMAT_WITH_SECONDS } from './constants';
import { SYSTEM_USER_LABEL } from '../change_history_flyout/translations';
import { RuleChangeHistoryAction } from './rule_change_history_action';

interface ChangeHistoryTimelineItemProps {
  item: RuleHistoryItem;
  onOpenDetails: (item: RuleHistoryItem) => void;
}

export function ChangeHistoryTimelineItem({
  item,
  onOpenDetails,
}: ChangeHistoryTimelineItemProps): JSX.Element {
  const date = useMemo(
    () => (
      <EuiToolTip
        position="top"
        content={moment(item.timestamp).format(DATE_DISPLAY_FORMAT_WITH_SECONDS)}
      >
        <FormattedRelativePreferenceDate value={item.timestamp} dateFormat={DATE_DISPLAY_FORMAT} />
      </EuiToolTip>
    ),
    [item.timestamp]
  );

  return (
    <EuiTimelineItem verticalAlign="top" icon={<UserAvatar user={item.user} />}>
      <RuleChangeHistoryAction
        item={item}
        date={date}
        username={item.user?.name ?? SYSTEM_USER_LABEL}
        onOpenDetails={onOpenDetails}
      />
    </EuiTimelineItem>
  );
}

interface UserAvatarProps {
  user?: RuleHistoryItem['user'];
}

const UserAvatar = memo(function UserAvatar({ user }: UserAvatarProps): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiAvatar
      name={user?.name ?? SYSTEM_USER_LABEL}
      iconType={user ? 'user' : 'logoElastic'}
      color={euiTheme.colors.backgroundBaseSubdued}
    />
  );
});
