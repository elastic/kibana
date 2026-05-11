/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { getIndicatorFieldAndValue } from '../../../threat_intelligence/modules/indicators/utils/field_value';
import { IndicatorFieldLabel } from '../../../threat_intelligence/modules/indicators/components/common/field_label';
import { IndicatorFieldValue } from '../../../threat_intelligence/modules/indicators/components/common/field_value';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { FlyoutHeaderBlock } from '../../shared/components/flyout_header_block';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';

export const HEADER_BLOCK_TEST_ID = 'iocHeaderBlock';
export const HEADER_BLOCK_ITEM_TEST_ID = 'iocHeaderBlockItem';

export interface HeaderBlockProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
  /**
   * The indicator field to display
   */
  field: string;
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Displays a single high-level indicator field in the flyout header
 */
export const HeaderBlock = ({ indicator, field, renderCellActions }: HeaderBlockProps) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  return (
    <FlyoutHeaderBlock
      hasBorder
      title={<IndicatorFieldLabel field={field} />}
      data-test-subj={`${HEADER_BLOCK_TEST_ID}-${field}`}
    >
      {renderCellActions({
        field: key,
        value: value ?? [],
        scopeId: '',
        children: (
          <div data-test-subj={HEADER_BLOCK_ITEM_TEST_ID}>
            <EuiText size="s">
              <IndicatorFieldValue indicator={indicator} field={field} />
            </EuiText>
          </div>
        ),
      })}
    </FlyoutHeaderBlock>
  );
};

HeaderBlock.displayName = 'HeaderBlock';
