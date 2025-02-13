/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableEsqlFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { EsqlQueryEditForm } from './fields/esql_query';
import { AlertSuppressionEditForm } from './fields/alert_suppression';

interface EsqlRuleFieldEditProps {
  fieldName: UpgradeableEsqlFields;
}

export function EsqlRuleFieldEdit({ fieldName }: EsqlRuleFieldEditProps) {
  switch (fieldName) {
    case 'esql_query':
      return <EsqlQueryEditForm />;
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
