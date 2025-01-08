/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableEsqlFields } from '../../../../../../../common/api/detection_engine';
import { EsqlQueryReadOnly } from './fields/esql_query/esql_query';
import { TypeReadOnly } from './fields/type/type';
import { AlertSuppressionReadOnly } from './fields/alert_suppression/alert_suppression';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface EsqlRuleFieldReadOnlyProps {
  fieldName: keyof DiffableEsqlFields;
  finalDiffableRule: DiffableEsqlFields;
}

export function EsqlRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: EsqlRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return (
        <AlertSuppressionReadOnly
          alertSuppression={finalDiffableRule.alert_suppression}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'esql_query':
      return <EsqlQueryReadOnly esqlQuery={finalDiffableRule.esql_query} />;
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
      return assertUnreachable(fieldName);
  }
}
