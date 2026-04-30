/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { getIndicatorFieldAndValue } from '../../../threat_intelligence/modules/indicators/utils/field_value';
import { IndicatorFieldLabel } from '../../../threat_intelligence/modules/indicators/components/common/field_label';
import { IndicatorFieldValue } from '../../../threat_intelligence/modules/indicators/components/common/field_value';
import { CellActionsMode, SecurityCellActions } from '../../../common/components/cell_actions';
import { FlyoutHeaderBlock } from '../../shared/components/flyout_header_block';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';

export const HEADER_BLOCK_TEST_ID = 'iocHeaderBlock';
export const HEADER_BLOCK_ITEM_TEST_ID = 'iocHeaderBlockItem';

export interface HeaderBlockProps {
  indicator: Indicator;
  field: string;
}

export const HeaderBlock = ({ indicator, field }: HeaderBlockProps) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  return (
    <FlyoutHeaderBlock
      hasBorder
      title={<IndicatorFieldLabel field={field} />}
      data-test-subj={`${HEADER_BLOCK_TEST_ID}-${field}`}
    >
      <SecurityCellActions
        data={{ field: key, value }}
        mode={CellActionsMode.HOVER_DOWN}
        triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
      >
        <div data-test-subj={HEADER_BLOCK_ITEM_TEST_ID}>
          <EuiText size="s">
            <IndicatorFieldValue indicator={indicator} field={field} />
          </EuiText>
        </div>
      </SecurityCellActions>
    </FlyoutHeaderBlock>
  );
};

HeaderBlock.displayName = 'HeaderBlock';
