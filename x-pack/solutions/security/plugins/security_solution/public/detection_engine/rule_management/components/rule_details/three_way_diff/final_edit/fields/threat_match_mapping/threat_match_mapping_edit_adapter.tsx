/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { ThreatMatchMappingEdit } from '../../../../../../../rule_creation/components/threat_match_mapping_edit';
import type { ThreatIndex } from '../../../../../../../../../common/api/detection_engine';
import type { RuleFieldEditComponentProps } from '../../../field_final_side';
import { useDataView } from '../hooks/use_data_view';
import { useDiffableRuleDataView } from '../hooks/use_diffable_rule_data_view';

export function ThreatMatchMappingEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element | null {
  const { dataView: ruleDataView } = useDiffableRuleDataView(finalDiffableRule);
  const { dataView: threatIndexPatterns } = useDataView({
    indexPatterns: (finalDiffableRule as { threat_index: ThreatIndex }).threat_index ?? [],
  });

  return (
    <ThreatMatchMappingEdit
      path="threat_mapping"
      indexPatterns={ruleDataView ?? DEFAULT_DATA_VIEW}
      threatIndexPatterns={threatIndexPatterns ?? DEFAULT_DATA_VIEW}
    />
  );
}

const DEFAULT_DATA_VIEW: DataViewBase = {
  fields: [],
  title: '',
};
