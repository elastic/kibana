/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import { EuiSpacer } from '@elastic/eui';
import { ThreatMatchIndexEdit } from '../../rule_creation/components/threat_match_index_edit';
import { ThreatMatchQueryEdit } from '../../rule_creation/components/threat_match_query_edit';
import { ThreatMatchMappingEdit } from '../../rule_creation/components/threat_match_mapping_edit';

interface ThreatMatchEditProps {
  indexPatternPath: string;
  queryPath: string;
  mappingPath: string;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  loading?: boolean;
}

export const ThreatMatchEdit = memo(function ThreatMatchEdit({
  indexPatternPath,
  queryPath,
  mappingPath,
  indexPatterns,
  threatIndexPatterns,
  loading,
}: ThreatMatchEditProps): JSX.Element {
  return (
    <>
      <EuiSpacer size="xl" />
      <ThreatMatchIndexEdit path={indexPatternPath} />
      <EuiSpacer size="m" />
      <ThreatMatchQueryEdit
        path={queryPath}
        threatIndexPatterns={threatIndexPatterns}
        loading={loading}
      />
      <EuiSpacer size="m" />
      <ThreatMatchMappingEdit
        path={mappingPath}
        indexPatterns={indexPatterns}
        threatIndexPatterns={threatIndexPatterns}
      />
      <EuiSpacer size="m" />
    </>
  );
});
