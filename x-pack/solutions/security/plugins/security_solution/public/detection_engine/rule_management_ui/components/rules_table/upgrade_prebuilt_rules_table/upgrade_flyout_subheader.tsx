/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { convertFieldToDisplayName } from '../../../../rule_management/components/rule_details/helpers';
import type { FieldsDiff } from '../../../../../../common/api/detection_engine';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { SeverityBadge } from '../../../../../common/components/severity_badge';
import { ModifiedBadge } from '../../../../rule_management/components/rule_details/three_way_diff/badges/modified_badge';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import * as i18n from './translations';

interface UpgradeFlyoutSubHeaderProps {
  ruleUpgradeState: RuleUpgradeState;
}

export const UpgradeFlyoutSubHeader = memo(function UpgradeFlyoutSubHeader({
  ruleUpgradeState,
}: UpgradeFlyoutSubHeaderProps): JSX.Element {
  const lastUpdate = (
    <EuiText size="s">
      <strong>
        {i18n.LAST_UPDATE}
        {':'}
      </strong>{' '}
      {i18n.UPDATED_BY_AND_WHEN(
        ruleUpgradeState.current_rule.updated_by,
        <FormattedDate value={ruleUpgradeState.current_rule.updated_at} fieldName="" />
      )}
    </EuiText>
  );

  const severity = (
    <EuiFlexGroup gutterSize="xs">
      <EuiText size="s">
        <strong>
          {i18n.SEVERITY}
          {':'}
        </strong>
      </EuiText>
      <SeverityBadge value={ruleUpgradeState.target_rule.severity} />
    </EuiFlexGroup>
  );

  const customized = ruleUpgradeState.current_rule.rule_source.type === 'external' &&
    ruleUpgradeState.current_rule.rule_source.is_customized && (
      <ModifiedBadge tooltip={i18n.RULE_MODIFIED_BADGE_DESCRIPTION} />
    );

  const fieldsDiff: FieldsDiff<Record<string, unknown>> = ruleUpgradeState.diff.fields;
  const fieldsNamesWithUpdates = Object.keys(ruleUpgradeState.fieldsUpgradeState).filter(
    (fieldName) => fieldsDiff[fieldName].has_update
  );
  const fieldUpdates = !fieldsDiff.type && fieldsNamesWithUpdates.length > 0 && (
    <EuiText size="s">
      <strong>
        {i18n.FIELD_UPDATES}
        {':'}
      </strong>{' '}
      {fieldsNamesWithUpdates.map((fieldName) => convertFieldToDisplayName(fieldName)).join(', ')}
    </EuiText>
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>{lastUpdate}</EuiFlexItem>
        <EuiFlexItem grow={false}>{severity}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {customized && <EuiFlexItem grow={false}>{customized}</EuiFlexItem>}
        <EuiFlexItem grow={false}>{fieldUpdates}</EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
