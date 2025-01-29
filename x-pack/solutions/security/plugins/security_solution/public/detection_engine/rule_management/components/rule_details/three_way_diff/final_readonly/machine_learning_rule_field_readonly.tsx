/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableMachineLearningFields } from '../../../../../../../common/api/detection_engine';
import { MachineLearningJobIdReadOnly } from './fields/machine_learning_job_id/machine_learning_job_id';
import { TypeReadOnly } from './fields/type/type';
import { AlertSuppressionReadOnly } from './fields/alert_suppression/alert_suppression';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { AnomalyThresholdReadOnly } from './fields/anomaly_threshold/anomaly_threshold';

interface MachineLearningRuleFieldReadOnlyProps {
  fieldName: keyof DiffableMachineLearningFields;
  finalDiffableRule: DiffableMachineLearningFields;
}

export function MachineLearningRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: MachineLearningRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'anomaly_threshold':
      return <AnomalyThresholdReadOnly anomalyThreshold={finalDiffableRule.anomaly_threshold} />;
    case 'alert_suppression':
      return (
        <AlertSuppressionReadOnly
          alertSuppression={finalDiffableRule.alert_suppression}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'machine_learning_job_id':
      return (
        <MachineLearningJobIdReadOnly
          machineLearningJobId={finalDiffableRule.machine_learning_job_id}
        />
      );
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
      return assertUnreachable(fieldName);
  }
}
