/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { startCase, camelCase } from 'lodash';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import type { PartialRuleDiff, RuleResponse } from '../../../../../../common/api/detection_engine';
import * as i18n from './translations';
import { fieldToDisplayNameMap } from '../diff_components/translations';

interface RuleCustomizationsFlyoutSubheaderProps {
  currentRule: RuleResponse;
  diff: PartialRuleDiff;
  isOutdated: boolean;
}

export const RuleCustomizationsFlyoutSubheader = ({
  currentRule,
  diff,
  isOutdated,
}: RuleCustomizationsFlyoutSubheaderProps) => {
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
  const fieldModifications = fieldsDiff.length > 0 && (
    <EuiText size="s">
      <strong>
        {i18n.FIELD_MODIFICATIONS}
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
        <EuiFlexItem grow={false}>{fieldModifications}</EuiFlexItem>
      </EuiFlexGroup>
      {isOutdated && (
        <>
          <EuiSpacer size="xs" />
          <EuiCallOut color="warning" iconType="warning">
            <p>{i18n.OUTDATED_DIFF_CALLOUT_MESSAGE}</p>
          </EuiCallOut>
        </>
      )}
    </>
  );
};
