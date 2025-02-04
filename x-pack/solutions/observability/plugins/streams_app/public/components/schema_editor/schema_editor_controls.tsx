/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSearchBar } from '@elastic/eui';
import { FieldStatusFilterGroup } from './filters/status_filter_group';
import { FieldTypeFilterGroup } from './filters/type_filter_group';
import { TControls } from './hooks/use_controls';

interface ControlsProps {
  controls: TControls;
  onChange: (nextControls: Partial<TControls>) => void;
}

export function Controls({ controls, onChange }: ControlsProps) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiSearchBar
            query={controls.query}
            onChange={(nextQuery) => onChange({ query: nextQuery.query ?? undefined })}
            box={{
              incremental: true,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldTypeFilterGroup onChange={onChange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FieldStatusFilterGroup onChange={onChange} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
