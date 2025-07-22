/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesQueryRuleCriteria } from '@elastic/elasticsearch/lib/api/types';
import { EuiText, EuiBadge, EuiTextColor, useEuiTheme } from '@elastic/eui';
import React from 'react';

export const QueryRuleDraggableItemCriteriaDisplay: React.FC<{
  criteria: QueryRulesQueryRuleCriteria;
}> = ({ criteria }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText size="s">
      {Boolean(criteria.metadata) && (
        <>
          <EuiBadge>{criteria.metadata}</EuiBadge>&nbsp;
        </>
      )}
      {criteria.type === 'always' ? (
        <EuiBadge> {criteria.type}</EuiBadge>
      ) : (
        <>
          <EuiTextColor color={euiTheme.colors.textPrimary}>{criteria.type}</EuiTextColor>&nbsp;
        </>
      )}
      {criteria.values?.join(', ')}
    </EuiText>
  );
};
