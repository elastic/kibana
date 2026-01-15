/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';

export type ViewMode = 'changes_only' | 'full';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = React.memo(
  ({ viewMode, onChange }) => {
    const options = useMemo(
      () => [
        {
          id: 'changes_only',
          label: 'Changes Only',
        },
        {
          id: 'full',
          label: 'Full Comparison',
        },
      ],
      []
    );

    const handleChange = useCallback(
      (id: string) => {
        onChange(id as ViewMode);
      },
      [onChange]
    );

    return (
      <EuiButtonGroup
        legend="View mode"
        options={options}
        idSelected={viewMode}
        onChange={handleChange}
        buttonSize="compressed"
      />
    );
  }
);

ViewModeToggle.displayName = 'ViewModeToggle';
