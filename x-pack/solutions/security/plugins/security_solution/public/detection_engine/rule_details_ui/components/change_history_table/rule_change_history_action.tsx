/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';

import { SecurityRuleChangeTrackingAction } from '../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { RuleActionItemWrapper } from './rule_action_item_wrapper';
import { extractChangedFieldNames } from '../../utils/extract_changed_field_names';
import { INLINE_CHANGED_FIELDS_LIMIT, POPOVER_CHANGED_FIELDS_LIMIT } from './constants';
import * as i18n from './translations';
import { ChangedFieldsBadges } from './changed_fields_badges';
import { describeAction } from '../change_history_flyout/describe_action';

export interface ActionItemContentProps {
  item: RuleHistoryItem;
  date: React.ReactNode;
  username: string;
  onOpenDetails: (item: RuleHistoryItem) => void;
}

export const RuleChangeHistoryAction = memo(function RuleChangeHistoryAction({
  item,
  date,
  username,
  onOpenDetails,
}: ActionItemContentProps): JSX.Element {
  const changedFields = useMemo(() => extractChangedFieldNames(item), [item]);

  switch (item.action) {
    case RuleChangeTrackingAction.ruleEnable:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_ENABLED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleDisable:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_DISABLED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleSnooze:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_SNOOZED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleUnsnooze:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_UNSNOOZED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleUpdateApiKey:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_API_KEY_UPDATED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleCreate:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_CREATED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleUpdate:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_REVISION_MESSAGE
              date={date}
              username={username}
              revision={item.rule.revision}
              fields={
                <ChangedFieldsBadges
                  fields={changedFields}
                  inlineLimit={INLINE_CHANGED_FIELDS_LIMIT}
                  overflowLimit={POPOVER_CHANGED_FIELDS_LIMIT}
                />
              }
            />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case RuleChangeTrackingAction.ruleDelete:
      return (
        <RuleActionItemWrapper item={item}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_DELETED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case SecurityRuleChangeTrackingAction.ruleInstall:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_INSTALL_MESSAGE
              date={date}
              username={username}
              version={item.rule.version ?? item.rule.revision}
            />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case SecurityRuleChangeTrackingAction.ruleUpgrade:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.ELASTIC_VERSION_MESSAGE
              date={date}
              username={username}
              version={item.rule.version ?? item.rule.revision}
              fields={
                <ChangedFieldsBadges
                  fields={changedFields}
                  inlineLimit={INLINE_CHANGED_FIELDS_LIMIT}
                  overflowLimit={POPOVER_CHANGED_FIELDS_LIMIT}
                />
              }
            />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case SecurityRuleChangeTrackingAction.ruleDuplicate:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_DUPLICATED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case SecurityRuleChangeTrackingAction.ruleImport:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_IMPORTED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    case SecurityRuleChangeTrackingAction.ruleRevert:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_REVERTED_MESSAGE date={date} username={username} />
          </EuiText>
        </RuleActionItemWrapper>
      );

    default:
      return (
        <RuleActionItemWrapper item={item} onOpenDetails={onOpenDetails}>
          <EuiText size="s" data-test-subj={`ruleChangeHistoryItem-${item.id}`}>
            <i18n.RULE_GENERIC_CHANGE_MESSAGE
              date={date}
              username={username}
              action={describeAction(item.action)}
            />
          </EuiText>
        </RuleActionItemWrapper>
      );
  }
});
