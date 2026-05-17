/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTimelineItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import {
  DATE_DISPLAY_FORMAT,
  DATE_DISPLAY_FORMAT_WITH_SECONDS,
  IGNORED_DIFF_FIELDS,
} from './constants';
import { describeAction } from '../change_history_flyout/describe_action';
import { extractChangedFieldNames } from '../change_history_flyout/extract_changed_field_names';
import { SYSTEM_USER_LABEL } from '../change_history_flyout/translations';
import * as i18n from './translations';

interface ChangeHistoryTimelineItemProps {
  item: RuleHistoryItem;
  onOpenDetails: (item: RuleHistoryItem) => void;
}

export function ChangeHistoryTimelineItem({
  item,
  onOpenDetails,
}: ChangeHistoryTimelineItemProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const userName = item.user?.name ?? SYSTEM_USER_LABEL;
  const changedFields = useMemo(() => extractChangedFieldNames(item, IGNORED_DIFF_FIELDS), [item]);
  const isRuleUpdate = item.action === 'rule_update';

  return (
    <EuiTimelineItem
      verticalAlign="top"
      icon={
        <EuiAvatar
          name={userName}
          iconType={item.user ? 'user' : 'logoElastic'}
          color={euiTheme.colors.backgroundBaseSubdued}
        />
      }
    >
      <EuiPanel
        hasBorder={false}
        paddingSize="s"
        css={css`
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      >
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
          responsive={false}
          direction="row"
        >
          <EuiFlexItem>
            <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
              {isRuleUpdate ? (
                <i18n.RULE_UPDATE_MESSAGE
                  date={
                    <EuiToolTip
                      position="top"
                      content={moment(item.timestamp).format(DATE_DISPLAY_FORMAT_WITH_SECONDS)}
                    >
                      <FormattedRelativePreferenceDate
                        value={item.timestamp}
                        dateFormat={DATE_DISPLAY_FORMAT}
                      />
                    </EuiToolTip>
                  }
                  username={userName}
                  revision={item.rule.revision}
                  fields={changedFields}
                />
              ) : (
                <i18n.RULE_CHANGE_MESSAGE
                  date={
                    <EuiToolTip
                      position="top"
                      content={moment(item.timestamp).format(DATE_DISPLAY_FORMAT_WITH_SECONDS)}
                    >
                      <FormattedRelativePreferenceDate
                        value={item.timestamp}
                        dateFormat={DATE_DISPLAY_FORMAT}
                      />
                    </EuiToolTip>
                  }
                  username={userName}
                  action={describeAction(item.action)}
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={() => onOpenDetails(item)}
              data-test-subj={`ruleChangeHistoryViewDetails-${item.id}`}
            >
              <i18n.VIEW_DETAILS_LINK />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiTimelineItem>
  );
}
