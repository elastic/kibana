/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import React, { useMemo, VFC } from 'react';
import { useIndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { EMPTY_VALUE } from '../../../../constants/common';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { unwrapValue } from '../../utils/unwrap_value';
import { IndicatorEmptyPrompt } from './empty_prompt';
import { IndicatorBlock } from './block';
import { HighlightedValuesTable } from './highlighted_values_table';
import {
  INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  INDICATORS_FLYOUT_OVERVIEW_TABLE,
  INDICATORS_FLYOUT_OVERVIEW_TITLE,
} from './test_ids';

const highLevelFields = [
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.MarkingTLP,
  RawIndicatorFieldId.Confidence,
];

export interface IndicatorsFlyoutOverviewProps {
  indicator: Indicator;
  onViewAllFieldsInTable: VoidFunction;
}

export const IndicatorsFlyoutOverview: VFC<IndicatorsFlyoutOverviewProps> = ({
  indicator,
  onViewAllFieldsInTable,
}) => {
  const { indicatorName } = useIndicatorsFlyoutContext();

  const indicatorType = unwrapValue(indicator, RawIndicatorFieldId.Type);

  const highLevelBlocks = useMemo(
    () => (
      <EuiFlexGroup data-test-subj={INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}>
        {highLevelFields.map((field) => (
          <EuiFlexItem key={field}>
            <IndicatorBlock
              indicator={indicator}
              field={field}
              data-test-subj={INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    [indicator]
  );

  const indicatorDescription = useMemo(() => {
    const unwrappedDescription = unwrapValue(indicator, RawIndicatorFieldId.Description);

    return unwrappedDescription ? <EuiText>{unwrappedDescription}</EuiText> : null;
  }, [indicator]);

  const title =
    indicatorName != null
      ? indicatorName
      : unwrapValue(indicator, RawIndicatorFieldId.Name) || EMPTY_VALUE;

  if (!indicatorType) {
    return <IndicatorEmptyPrompt />;
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

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.threatIntelligence.indicator.flyoutOverviewTable.highlightedFields"
                defaultMessage="Highlighted fields"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onViewAllFieldsInTable}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyoutOverviewTable.viewAllFieldsInTable"
              defaultMessage="View all fields in table"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <HighlightedValuesTable
        indicator={indicator}
        data-test-subj={INDICATORS_FLYOUT_OVERVIEW_TABLE}
      />
    </>
  );
};
