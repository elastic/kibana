/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useController } from 'react-hook-form';

import { IndexName } from '@elastic/elasticsearch/lib/api/types';

import { AnalyticsEvents } from '../analytics/constants';
import { ChatFormFields } from '../types';

import { useIndicesFields } from './use_indices_fields';

import { useUsageTracker } from './use_usage_tracker';

export const useSourceIndicesFields = () => {
  const usageTracker = useUsageTracker();
  const {
    field: { value: selectedIndices, onChange: onIndicesChange },
  } = useController({
    name: ChatFormFields.indices,
  });
  const { fields, isLoading: isFieldsLoading } = useIndicesFields(selectedIndices);

  const addIndex = useCallback(
    (newIndex: IndexName) => {
      const newIndices = [...selectedIndices, newIndex];
      onIndicesChange(newIndices);
      usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, newIndices.length);
    },
    [onIndicesChange, selectedIndices, usageTracker]
  );

  const removeIndex = useCallback(
    (index: IndexName) => {
      const newIndices = selectedIndices.filter((indexName: string) => indexName !== index);
      onIndicesChange(newIndices);
      usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, newIndices.length);
    },
    [onIndicesChange, selectedIndices, usageTracker]
  );

  const setIndices = useCallback(
    (indices: IndexName[]) => {
      onIndicesChange(indices);
      usageTracker?.count(AnalyticsEvents.sourceIndexUpdated, indices.length);
    },
    [onIndicesChange, usageTracker]
  );

  return {
    indices: selectedIndices,
    fields,
    isFieldsLoading,
    addIndex,
    removeIndex,
    setIndices,
  };
};
