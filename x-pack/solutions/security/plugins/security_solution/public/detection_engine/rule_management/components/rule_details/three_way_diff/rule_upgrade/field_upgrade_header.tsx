/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';
import type { FieldUpgradeStateEnum } from '../../../../model/prebuilt_rule_upgrade';
import { FieldUpgradeStateInfo } from './field_upgrade_state_info';
import { ModifiedBadge } from '../badges/modified_badge';
import { FIELD_MODIFIED_BADGE_DESCRIPTION } from './translations';

interface FieldUpgradeHeaderProps {
  fieldName: string;
  fieldUpgradeState: FieldUpgradeStateEnum;
  isCustomized: boolean;
}

export function FieldUpgradeHeader({
  fieldName,
  fieldUpgradeState,
  isCustomized,
}: FieldUpgradeHeaderProps): JSX.Element {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiTitle data-test-subj="ruleUpgradeFieldDiffLabel" size="xs">
        <h5>{fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName))}</h5>
      </EuiTitle>

      {isCustomized && <ModifiedBadge tooltip={FIELD_MODIFIED_BADGE_DESCRIPTION} />}

      <FieldUpgradeStateInfo state={fieldUpgradeState} />
    </EuiFlexGroup>
  );
}
