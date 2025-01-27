/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MachineLearningJobIdEdit } from '../../../../../../../rule_creation/components/machine_learning_job_id_edit';

export function MachineLearningJobIdAdapter(): JSX.Element {
  return <MachineLearningJobIdEdit path="machine_learning_job_id" shouldShowHelpText={false} />;
}
