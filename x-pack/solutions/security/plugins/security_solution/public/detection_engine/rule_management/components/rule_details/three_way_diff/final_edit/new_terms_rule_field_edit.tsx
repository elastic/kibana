/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableNewTermsFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { AlertSuppressionEditForm } from './fields/alert_suppression';
import { DataSourceEditForm } from './fields/data_source';
import { HistoryWindowStartEditForm } from './fields/history_window_start/history_window_start_edit_form';
import { KqlQueryEditForm } from './fields/kql_query';
import { NewTermsFieldsEditForm } from './fields/new_terms_fields/new_terms_fields_edit_form';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface NewTermsRuleFieldEditProps {
  fieldName: UpgradeableNewTermsFields;
}

export function NewTermsRuleFieldEdit({ fieldName }: NewTermsRuleFieldEditProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    case 'history_window_start':
      return <HistoryWindowStartEditForm />;
    case 'kql_query':
      return <KqlQueryEditForm />;
    case 'new_terms_fields':
      return <NewTermsFieldsEditForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
