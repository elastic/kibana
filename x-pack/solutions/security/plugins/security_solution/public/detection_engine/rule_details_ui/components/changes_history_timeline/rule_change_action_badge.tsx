/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { IconColor, IconType } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import { SecurityRuleChangeTrackingAction } from '../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import * as i18n from './translations';

interface RuleChangeActionBadgeProps {
  item: RuleHistoryItem;
  isCurrent?: boolean;
}

export const RuleChangeActionBadge = memo(function RuleChangeActionBadge({
  item,
  isCurrent,
}: RuleChangeActionBadgeProps): JSX.Element | null {
  switch (item.action) {
    case RuleChangeTrackingAction.ruleEnable:
      return (
        <ChangeActionBadge
          icon="dot"
          iconColor="success"
          text={i18n.ACTION_LABEL_ENABLED}
          isCurrent={isCurrent}
        />
      );

    case RuleChangeTrackingAction.ruleDisable:
      return (
        <ChangeActionBadge
          icon="dot"
          iconColor="danger"
          text={i18n.ACTION_LABEL_DISABLED}
          isCurrent={isCurrent}
        />
      );

    case RuleChangeTrackingAction.ruleSnooze:
      return (
        <ChangeActionBadge
          icon="bellSlash"
          text={i18n.ACTION_LABEL_SNOOZED}
          isCurrent={isCurrent}
        />
      );

    case RuleChangeTrackingAction.ruleUnsnooze:
      return (
        <ChangeActionBadge icon="bell" text={i18n.ACTION_LABEL_UNSNOOZED} isCurrent={isCurrent} />
      );

    case RuleChangeTrackingAction.ruleUpdateApiKey:
      return <ChangeActionBadge text={i18n.ACTION_LABEL_API_KEY_UPDATED} isCurrent={isCurrent} />;

    case RuleChangeTrackingAction.ruleCreate:
      return <ChangeActionBadge text={i18n.ACTION_LABEL_CREATED} isCurrent={isCurrent} />;

    case RuleChangeTrackingAction.ruleDelete:
      return (
        <ChangeActionBadge icon="trash" text={i18n.ACTION_LABEL_DELETED} isCurrent={isCurrent} />
      );

    case SecurityRuleChangeTrackingAction.ruleInstall:
      return (
        <ChangeActionBadge icon="plus" text={i18n.ACTION_LABEL_INSTALLED} isCurrent={isCurrent} />
      );

    case SecurityRuleChangeTrackingAction.ruleUpgrade:
      return (
        <ChangeActionBadge icon="refresh" text={i18n.ACTION_LABEL_UPGRADED} isCurrent={isCurrent} />
      );

    case SecurityRuleChangeTrackingAction.ruleDuplicate:
      return (
        <ChangeActionBadge icon="copy" text={i18n.ACTION_LABEL_DUPLICATED} isCurrent={isCurrent} />
      );

    case SecurityRuleChangeTrackingAction.ruleImport:
      return (
        <ChangeActionBadge
          icon="download"
          text={i18n.ACTION_LABEL_IMPORTED}
          isCurrent={isCurrent}
        />
      );

    case SecurityRuleChangeTrackingAction.ruleRevert:
      return (
        <ChangeActionBadge
          icon="framePrevious"
          text={i18n.ACTION_LABEL_REVERTED}
          isCurrent={isCurrent}
        />
      );

    default:
      const isPrebuiltRule = item.rule.rule_source.type === 'external';

      return (
        <ChangeActionBadge
          text={
            isPrebuiltRule
              ? `R${item.rule.revision} • V${item.rule.version}`
              : `R${item.rule.revision}`
          }
          isCurrent={isCurrent}
        />
      );
  }
});

interface ChangeActionBadgeProps {
  icon?: IconType;
  iconColor?: IconColor;
  text: string;
  isCurrent?: boolean;
}

function ChangeActionBadge({
  icon,
  iconColor,
  text,
  isCurrent,
}: ChangeActionBadgeProps): JSX.Element {
  return (
    <EuiBadge color="hollow">
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {isCurrent && <EuiText size="xs">{`${i18n.CURRENT_VERSION} • `}</EuiText>}
        {icon && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} color={iconColor} size="s" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{text}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
}
