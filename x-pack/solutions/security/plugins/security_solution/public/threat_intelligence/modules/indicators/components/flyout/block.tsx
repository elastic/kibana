/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorFieldValue } from '../common/field_value';
import { IndicatorFieldLabel } from '../common/field_label';
import {
  CellActionsMode,
  SecurityCellActions,
  SecurityCellActionsTrigger,
} from '../../../../../common/components/cell_actions';
import { getIndicatorFieldAndValue } from '../../utils/field_value';

const panelProps = {
  color: 'subdued' as const,
  hasShadow: false,
  borderRadius: 'none' as const,
  paddingSize: 's' as const,
};

export interface IndicatorBlockProps {
  indicator: Indicator;
  field: string;
  ['data-test-subj']?: string;
}

/**
 * Renders indicator field value in a rectangle, to highlight it even more
 */
export const IndicatorBlock: FC<IndicatorBlockProps> = ({
  field,
  indicator,
  'data-test-subj': dataTestSubj,
}) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  return (
    <EuiPanel {...panelProps} data-test-subj={`${dataTestSubj}Item`}>
      <SecurityCellActions
        data={{ field: key, value }}
        mode={CellActionsMode.HOVER_DOWN}
        triggerId={SecurityCellActionsTrigger.DEFAULT}
      >
        <EuiText>
          <IndicatorFieldLabel field={field} />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <IndicatorFieldValue indicator={indicator} field={field} />
        </EuiText>
      </SecurityCellActions>
    </EuiPanel>
  );
};
