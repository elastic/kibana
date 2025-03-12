/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { EuiBadge } from '@elastic/eui';
import React from 'react';

interface TaskTypeProps {
  type?: InferenceTaskType;
}

export const TaskType: React.FC<TaskTypeProps> = ({ type }) => {
  if (type != null) {
    return (
      <EuiBadge data-test-subj={`table-column-task-type-${type}`} color="hollow">
        {type}
      </EuiBadge>
    );
  }

  return null;
};
