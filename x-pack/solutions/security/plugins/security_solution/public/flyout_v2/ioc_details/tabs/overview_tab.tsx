/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { getIndicatorFieldAndValue } from '../../../threat_intelligence/modules/indicators/utils/field_value';
import { FlyoutError } from '../../../flyout/shared/components/flyout_error';
import { unwrapValue } from '../../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { RawIndicatorFieldId } from '../../../../common/threat_intelligence/types/indicator';
import { IndicatorFieldLabel } from '../../../threat_intelligence/modules/indicators/components/common/field_label';
import { IndicatorFieldValue } from '../../../threat_intelligence/modules/indicators/components/common/field_value';
import { CellActionsMode, SecurityCellActions } from '../../../common/components/cell_actions';
import {
  FlyoutHeaderBlock,
  flyoutHeaderBlockStyles,
} from '../../shared/components/flyout_header_block';
import { HighlightedValuesTable } from '../components/highlighted_values_table';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';

export const INDICATORS_FLYOUT_OVERVIEW_TITLE = 'tiFlyoutOverviewTitle';
export const INDICATORS_FLYOUT_OVERVIEW_TABLE = 'tiFlyoutOverviewTableRow';
export const INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS = 'tiFlyoutOverviewHighLevelBlocks';
export const INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS_ITEM = `${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}Item`;

const highLevelFields = [
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.MarkingTLP,
  RawIndicatorFieldId.Confidence,
] as const;

export interface OverviewTabProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
  /**
   * Callback to navigate to the table tab, if not provided, hide the button
   */
  onViewAllFieldsInTable?: () => void;
}

interface IndicatorHeaderBlockProps {
  indicator: Indicator;
  field: string;
}

const IndicatorHeaderBlock = ({ indicator, field }: IndicatorHeaderBlockProps) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  return (
    <FlyoutHeaderBlock
      hasBorder
      title={<IndicatorFieldLabel field={field} />}
      data-test-subj={`${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}-${field}`}
    >
      <SecurityCellActions
        data={{ field: key, value }}
        mode={CellActionsMode.HOVER_DOWN}
        triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
      >
        <div data-test-subj={INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS_ITEM}>
          <EuiText size="s">
            <IndicatorFieldValue indicator={indicator} field={field} />
          </EuiText>
        </div>
      </SecurityCellActions>
    </FlyoutHeaderBlock>
  );
};

/**
 * Overview view displayed in the ioc details flyout
 */
export const OverviewTab = memo(({ indicator, onViewAllFieldsInTable }: OverviewTabProps) => {
  const indicatorType = unwrapValue(indicator, RawIndicatorFieldId.Type);

  const highLevelBlocks = useMemo(
    () => (
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        responsive={false}
        wrap
        data-test-subj={INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}
      >
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <IndicatorHeaderBlock indicator={indicator} field={highLevelFields[0]} />
            </EuiFlexItem>
            <EuiFlexItem>
              <IndicatorHeaderBlock indicator={indicator} field={highLevelFields[1]} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <IndicatorHeaderBlock indicator={indicator} field={highLevelFields[2]} />
            </EuiFlexItem>
            <EuiFlexItem>
              <IndicatorHeaderBlock indicator={indicator} field={highLevelFields[3]} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [indicator]
  );

  const indicatorDescription = useMemo(() => {
    const unwrappedDescription = unwrapValue(indicator, RawIndicatorFieldId.Description);

    return unwrappedDescription ? <EuiText>{unwrappedDescription}</EuiText> : null;
  }, [indicator]);

  const title: string | null = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.Name).value;

  if (!indicatorType) {
    return <FlyoutError />;
  }

  return (
    <>
      <EuiTitle>
        <h2 data-test-subj={INDICATORS_FLYOUT_OVERVIEW_TITLE}>{title}</h2>
      </EuiTitle>

      {indicatorDescription}

      <EuiSpacer />

      {highLevelBlocks}

      <EuiHorizontalRule />

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.threatIntelligence.indicator.flyoutOverviewTable.highlightedFields"
                defaultMessage="Highlighted fields"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {onViewAllFieldsInTable && (
            <EuiButtonEmpty onClick={onViewAllFieldsInTable}>
              <FormattedMessage
                id="xpack.securitySolution.threatIntelligence.indicator.flyoutOverviewTable.viewAllFieldsInTable"
                defaultMessage="View all fields in table"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <HighlightedValuesTable
        indicator={indicator}
        data-test-subj={INDICATORS_FLYOUT_OVERVIEW_TABLE}
      />
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
