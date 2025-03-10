/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { DELETE_LABEL } from '../../i18n_strings';

interface MetricRowControlProps {
  onDelete: () => void;
  disableDelete: boolean;
}

export const MetricRowControls = ({ onDelete, disableDelete }: MetricRowControlProps) => {
  return (
    <>
      <EuiFlexItem grow={0}>
        <EuiButtonIcon
          data-test-subj="infraMetricRowControlsButton"
          iconType="trash"
          color="danger"
          style={{ marginBottom: '0.2em' }}
          onClick={onDelete}
          disabled={disableDelete}
          title={DELETE_LABEL}
        />
      </EuiFlexItem>
    </>
  );
};
