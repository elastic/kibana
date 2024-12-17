/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableNewTermsFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { KqlQueryEditForm } from './fields/kql_query';
import { DataSourceEditForm } from './fields/data_source';
import { AlertSuppressionEditForm } from './fields/alert_suppression';

interface NewTermsRuleFieldEditProps {
  fieldName: UpgradeableNewTermsFields;
}

export function NewTermsRuleFieldEdit({ fieldName }: NewTermsRuleFieldEditProps) {
  switch (fieldName) {
    case 'kql_query':
      return <KqlQueryEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
