/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  InlineKqlQuery,
  RuleDataSource,
} from '../../../../../../../../../common/api/detection_engine';
import * as ruleDetailsI18n from '../../../../translations';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import { InlineKqlQueryReadOnly } from '../kql_query/inline_kql_query';

const i18nLabels = {
  query: descriptionStepI18n.THREAT_QUERY_LABEL,
  language: ruleDetailsI18n.THREAT_QUERY_LANGUAGE_LABEL,
  filters: ruleDetailsI18n.THREAT_FILTERS_FIELD_LABEL,
};

export interface ThreatQueryReadOnlyProps {
  threatQuery: InlineKqlQuery;
  dataSource?: RuleDataSource;
}

export const ThreatQueryReadOnly = ({ threatQuery, dataSource }: ThreatQueryReadOnlyProps) => {
  return (
    <InlineKqlQueryReadOnly
      kqlQuery={threatQuery}
      dataSource={dataSource}
      i18nLabels={i18nLabels}
    />
  );
};
