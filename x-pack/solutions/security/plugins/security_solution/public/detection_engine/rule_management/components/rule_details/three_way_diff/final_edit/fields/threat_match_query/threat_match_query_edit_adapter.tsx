/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { ThreatMatchQueryEdit } from '../../../../../../../rule_creation/components/threat_match_query_edit';
import type { ThreatIndex } from '../../../../../../../../../common/api/detection_engine';
import type { RuleFieldEditComponentProps } from '../../../field_final_side';
import { useDataView } from '../hooks/use_data_view';

export function ThreatMatchQueryEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element | null {
  const { dataView, isLoading } = useDataView({
    indexPatterns: (finalDiffableRule as { threat_index: ThreatIndex }).threat_index ?? [],
  });

  return (
    <ThreatMatchQueryEdit
      path="threatQuery"
      threatIndexPatterns={dataView ?? DEFAULT_DATA_VIEW}
      loading={isLoading}
    />
  );
}

const DEFAULT_DATA_VIEW: DataViewBase = {
  fields: [],
  title: '',
};
