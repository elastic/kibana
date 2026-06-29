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
}

export const RuleChangeActionBadge = memo(function RuleChangeActionBadge({
  item,
}: RuleChangeActionBadgeProps): JSX.Element | null {
  const { revision, rule_source: ruleSource, version: prebuiltRuleVersion } = item.rule;
  const version = ruleSource.type === 'external' ? prebuiltRuleVersion : undefined;

  switch (item.action) {
    case RuleChangeTrackingAction.ruleEnable:
      return <ChangeActionBadge icon="dot" iconColor="success" text={i18n.ACTION_LABEL_ENABLED} />;

    case RuleChangeTrackingAction.ruleDisable:
      return <ChangeActionBadge icon="dot" iconColor="danger" text={i18n.ACTION_LABEL_DISABLED} />;

    case RuleChangeTrackingAction.ruleSnooze:
      return <ChangeActionBadge icon="bellSlash" text={i18n.ACTION_LABEL_SNOOZED} />;

    case RuleChangeTrackingAction.ruleUnsnooze:
      return <ChangeActionBadge icon="bell" text={i18n.ACTION_LABEL_UNSNOOZED} />;

    case RuleChangeTrackingAction.ruleUpdateApiKey:
      return <ChangeActionBadge text={i18n.ACTION_LABEL_API_KEY_UPDATED} />;

    case RuleChangeTrackingAction.ruleCreate:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_CREATED}
            </>
          }
        />
      );

    case RuleChangeTrackingAction.ruleDelete:
      return <ChangeActionBadge text={i18n.ACTION_LABEL_DELETED} />;

    case SecurityRuleChangeTrackingAction.ruleInstall:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_INSTALLED}
            </>
          }
        />
      );

    case SecurityRuleChangeTrackingAction.ruleUpgrade:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_UPGRADED}
            </>
          }
        />
      );

    case SecurityRuleChangeTrackingAction.ruleDuplicate:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_DUPLICATED}
            </>
          }
        />
      );

    case SecurityRuleChangeTrackingAction.ruleImport:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_IMPORTED}
            </>
          }
        />
      );

    case SecurityRuleChangeTrackingAction.ruleRevert:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_REVERTED}
            </>
          }
        />
      );

    case SecurityRuleChangeTrackingAction.ruleRestore:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_RESTORED_FROM_HISTORY(
                item.metadata?.restored_from_revision as number | undefined
              )}
            </>
          }
        />
      );

    default:
      return (
        <ChangeActionBadge
          text={
            <>
              {i18n.RULE_REVISION_AND_VERSION({ revision, version })}
              {i18n.ACTION_LABEL_EDITED}
            </>
          }
        />
      );
  }
});

interface ChangeActionBadgeProps {
  icon?: IconType;
  iconColor?: IconColor;
  text: React.ReactNode;
}

function ChangeActionBadge({ icon, iconColor, text }: ChangeActionBadgeProps): JSX.Element {
  if (icon) {
    return (
      <EuiBadge color="hollow">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} color={iconColor} size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{text}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow">
      <EuiText size="xs">{text}</EuiText>
    </EuiBadge>
  );
}
