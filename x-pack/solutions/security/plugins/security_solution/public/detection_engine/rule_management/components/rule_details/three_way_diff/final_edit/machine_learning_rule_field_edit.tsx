/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableMachineLearningFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { AnomalyThresholdForm } from './fields/anomaly_threshold/anomaly_threshold_form';
import { AlertSuppressionEditForm } from './fields/alert_suppression';
import { MachineLearningJobIdForm } from './fields/machine_learning_job_id/machine_learning_job_id_form';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface MachineLearningRuleFieldEditProps {
  fieldName: UpgradeableMachineLearningFields;
}

export function MachineLearningRuleFieldEdit({ fieldName }: MachineLearningRuleFieldEditProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    case 'anomaly_threshold':
      return <AnomalyThresholdForm />;
    case 'machine_learning_job_id':
      return <MachineLearningJobIdForm />;
    default:
      return assertUnreachable(fieldName);
  }
}
