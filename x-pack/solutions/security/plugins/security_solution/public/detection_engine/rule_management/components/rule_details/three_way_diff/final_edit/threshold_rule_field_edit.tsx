/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableThresholdFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { KqlQueryEditForm } from './fields/kql_query';
import { DataSourceEditForm } from './fields/data_source';
import { ThresholdAlertSuppressionEditForm } from './fields/threshold_alert_suppression';
import { ThresholdEditForm } from './fields/threshold/threshold_edit_form';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface ThresholdRuleFieldEditProps {
  fieldName: UpgradeableThresholdFields;
}

export function ThresholdRuleFieldEdit({ fieldName }: ThresholdRuleFieldEditProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return <ThresholdAlertSuppressionEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    case 'kql_query':
      return <KqlQueryEditForm />;
    case 'threshold':
      return <ThresholdEditForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
