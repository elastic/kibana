/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import type {
  DiffableRuleTypes,
  RuleDataSource,
  RuleKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { InlineKqlQueryReadOnly } from './inline_kql_query';
import { SavedKqlQueryReadOnly } from './saved_kql_query';
import { assertUnreachable } from '../../../../../../../../../common/utility_types';

interface KqlQueryReadOnlyProps {
  kqlQuery: RuleKqlQuery;
  dataSource?: RuleDataSource;
  ruleType: DiffableRuleTypes;
}

export function KqlQueryReadOnly({ kqlQuery, dataSource, ruleType }: KqlQueryReadOnlyProps) {
  if (kqlQuery.type === KqlQueryType.inline_query) {
    return <InlineKqlQueryReadOnly kqlQuery={kqlQuery} dataSource={dataSource} />;
  }

  if (kqlQuery.type === KqlQueryType.saved_query) {
    return (
      <SavedKqlQueryReadOnly kqlQuery={kqlQuery} dataSource={dataSource} ruleType={ruleType} />
    );
  }

  return assertUnreachable(kqlQuery);
}
