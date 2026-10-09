/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  CONVERSATION_CATEGORY_COLORS,
  CONVERSATION_QUEUE_CATEGORIES,
  type RecommendedAction,
} from '@kbn/pnd-common';
import { ALL_CATEGORIES } from './translations';

interface CategoryFilterProps {
  selectedBucket: 'all' | RecommendedAction;
  bucketCounts: Record<RecommendedAction, number>;
  onChange: (bucket: 'all' | RecommendedAction) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedBucket,
  bucketCounts,
  onChange,
}) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        size="s"
        color={selectedBucket === 'all' ? 'primary' : 'text'}
        flush="both"
        onClick={() => onChange('all')}
      >
        {ALL_CATEGORIES}
      </EuiButtonEmpty>
    </EuiFlexItem>
    {CONVERSATION_QUEUE_CATEGORIES.map((bucket) => (
      <EuiFlexItem key={bucket.id} grow={false}>
        <EuiButton
          size="s"
          color={CONVERSATION_CATEGORY_COLORS[bucket.id]}
          fill={selectedBucket === bucket.id}
          onClick={() => onChange(selectedBucket === bucket.id ? 'all' : bucket.id)}
        >
          {bucket.label} {bucketCounts[bucket.id]}
        </EuiButton>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
