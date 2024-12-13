/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { DELETE_LABEL } from '../../i18n_strings';

interface MetricRowControlProps {
  onDelete: () => void;
  disableDelete: boolean;
}

export function MetricRowControls({ onDelete, disableDelete }: MetricRowControlProps) {
  return (
    <EuiButtonIcon
      data-test-subj="o11yMetricRowControlsButton"
      aria-label={DELETE_LABEL}
      iconType="cross"
      color="text"
      onClick={onDelete}
      disabled={disableDelete}
      title={DELETE_LABEL}
      size="xs"
      css={{ height: 16 }}
    />
  );
}
