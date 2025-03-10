/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import { FieldUpgradeStateEnum } from '../../../../../model/prebuilt_rule_upgrade';
import { ReadyForUpgradeBadge } from '../../badges/ready_for_upgrade_badge';
import { ReviewRequiredBadge } from '../../badges/review_required_badge';
import { ActionRequiredBadge } from '../../badges/action_required';
import * as i18n from './translations';

interface FieldUpgradeStateInfoProps {
  state: FieldUpgradeStateEnum;
}

export function FieldUpgradeStateInfo({ state }: FieldUpgradeStateInfoProps): JSX.Element {
  const { color, badge, title, description } = useMemo(() => {
    switch (state) {
      case FieldUpgradeStateEnum.NoUpdate:
        return {
          color: 'default',
          title: i18n.NO_UPDATE,
          description: i18n.NO_UPDATE_DESCRIPTION,
        };

      case FieldUpgradeStateEnum.SameUpdate:
        return {
          color: 'success',
          title: i18n.SAME_UPDATE,
          description: i18n.SAME_UPDATE_DESCRIPTION,
        };

      case FieldUpgradeStateEnum.NoConflict:
        return {
          color: 'success',
          badge: <ReadyForUpgradeBadge />,
          title: i18n.NO_CONFLICT,
          description: i18n.NO_CONFLICT_DESCRIPTION,
        };

      case FieldUpgradeStateEnum.Accepted:
        return {
          color: 'success',
          badge: <ReadyForUpgradeBadge />,
          title: i18n.REVIEWED_AND_ACCEPTED,
        };

      case FieldUpgradeStateEnum.SolvableConflict:
        return {
          color: 'warning',
          badge: <ReviewRequiredBadge />,
          title: i18n.SOLVABLE_CONFLICT,
          description: i18n.SOLVABLE_CONFLICT_DESCRIPTION,
        };

      case FieldUpgradeStateEnum.NonSolvableConflict:
        return {
          color: 'danger',
          badge: <ActionRequiredBadge />,
          title: i18n.NON_SOLVABLE_CONFLICT,
          description: i18n.NON_SOLVABLE_CONFLICT_DESCRIPTION,
        };

      default:
        return assertUnreachable(state);
    }
  }, [state]);

  return (
    <EuiText color={color} size="xs">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>{badge}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <strong>{title}</strong>
        </EuiFlexItem>

        {description && (
          <EuiFlexItem grow={false}>
            {i18n.SEPARATOR} {description}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiText>
  );
}
