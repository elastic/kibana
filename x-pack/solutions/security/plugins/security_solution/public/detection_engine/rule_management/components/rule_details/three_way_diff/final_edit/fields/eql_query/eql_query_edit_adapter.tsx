/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { EqlQueryEdit } from '../../../../../../../rule_creation/components/eql_query_edit';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';

export function EqlQueryEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element | null {
  const { dataView, isLoading } = useDiffableRuleDataView(finalDiffableRule);

  // Wait for dataView to be defined to trigger validation with the correct index patterns
  if (!dataView) {
    return null;
  }

  return (
    <EqlQueryEdit
      path="eqlQuery"
      eqlOptionsPath="eqlOptions"
      required
      dataView={dataView ?? DEFAULT_DATA_VIEW_BASE}
      loading={isLoading}
      disabled={isLoading}
      skipEqlValidation
    />
  );
}

const DEFAULT_DATA_VIEW_BASE: DataViewBase = {
  title: '',
  fields: [],
};
