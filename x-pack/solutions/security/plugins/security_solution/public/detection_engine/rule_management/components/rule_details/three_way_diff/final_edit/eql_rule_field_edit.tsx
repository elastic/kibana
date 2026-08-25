/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import type { UpgradeableEqlFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { DataSourceEditForm } from './fields/data_source';
import { AlertSuppressionEditForm } from './fields/alert_suppression';
import { EqlQueryEditForm } from './fields/eql_query';

interface EqlRuleFieldEditProps {
  fieldName: UpgradeableEqlFields;
}

export function EqlRuleFieldEdit({ fieldName }: EqlRuleFieldEditProps) {
  switch (fieldName) {
    case 'eql_query':
      return <EqlQueryEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
