/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { startCase, camelCase } from 'lodash';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import type { PartialRuleDiff, RuleResponse } from '../../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { fieldToDisplayNameMap } from '../diff_components/translations';

interface BaseVersionDiffFlyoutSubheaderProps {
  currentRule: RuleResponse;
  diff: PartialRuleDiff;
}

export const BaseVersionDiffFlyoutSubheader = ({
  currentRule,
  diff,
}: BaseVersionDiffFlyoutSubheaderProps) => {
  const lastUpdate = (
    <EuiText size="s">
      <strong>
        {i18n.LAST_UPDATE}
        {':'}
      </strong>{' '}
      {i18n.UPDATED_BY_AND_WHEN(
        currentRule.updated_by,
        <FormattedDate value={currentRule.updated_at} fieldName="" />
      )}
    </EuiText>
  );

  const fieldsDiff = Object.keys(diff.fields);
  const fieldUpdates = fieldsDiff.length > 0 && (
    <EuiText size="s">
      <strong>
        {i18n.FIELD_UPDATES}
        {':'}
      </strong>{' '}
      {fieldsDiff
        .map((fieldName) => fieldToDisplayNameMap[fieldName] ?? startCase(camelCase(fieldName)))
        .join(', ')}
    </EuiText>
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>{lastUpdate}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>{fieldUpdates}</EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
