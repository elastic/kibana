/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface DeltaBadgeProps {
  delta?: number;
  previous?: number;
  /** When true, an increase is rendered as bad (danger) and a decrease as good (success). */
  upIsBad: boolean;
  'data-test-subj'?: string;
}

/** Polarity-aware delta badge. Shows "new" when there was no previous value. */
export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  delta,
  previous,
  upIsBad,
  'data-test-subj': dataTestSubj,
}) => {
  if (delta === undefined) return null;

  if (previous === 0 && delta > 0) {
    return (
      <EuiBadge color={upIsBad ? 'danger' : 'success'} data-test-subj={dataTestSubj}>
        {'new'}
      </EuiBadge>
    );
  }

  if (delta === 0) {
    return (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
        {'no change'}
      </EuiBadge>
    );
  }

  const isUp = delta > 0;
  const isBad = isUp === upIsBad;
  return (
    <EuiBadge
      color={isBad ? 'danger' : 'success'}
      iconType={isUp ? 'sortUp' : 'sortDown'}
      data-test-subj={dataTestSubj}
    >
      {isUp ? `+${delta}` : `${delta}`}
    </EuiBadge>
  );
};
