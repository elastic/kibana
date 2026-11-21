/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProgress } from '@elastic/eui';
import type { EuiProgressProps } from '@elastic/eui';
import * as i18n from '../translations';

interface LibrarySyncBarProps {
  // Without a total the bar slides across instead of filling.
  progress?: { done: number; total?: number };
  position?: EuiProgressProps['position'];
  'data-test-subj': string;
}

export const LibrarySyncBar = ({
  progress,
  position = 'static',
  'data-test-subj': dataTestSubj,
}: LibrarySyncBarProps) => {
  const total = progress?.total;
  const isFilling = progress !== undefined && total !== undefined && total > 0;

  return (
    <EuiProgress
      size="xs"
      color="primary"
      position={position}
      aria-label={
        isFilling
          ? i18n.SYNC_BAR_ARIA_LABEL(progress.done, total)
          : i18n.SYNC_BAR_INDETERMINATE_ARIA_LABEL
      }
      {...(isFilling ? { value: Math.min(progress.done, total), max: total } : {})}
      data-test-subj={dataTestSubj}
    />
  );
};
