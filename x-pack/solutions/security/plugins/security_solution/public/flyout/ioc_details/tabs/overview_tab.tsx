/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
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
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { IOCRightPanelKey } from '../constants/panel_keys';
import { getIndicatorFieldAndValue } from '../../../threat_intelligence/modules/indicators/utils/field_value';
import { IndicatorEmptyPrompt } from '../components/empty_prompt';
import { unwrapValue } from '../../../threat_intelligence/modules/indicators/utils/unwrap_value';
import { RawIndicatorFieldId } from '../../../../common/threat_intelligence/types/indicator';
import { IndicatorBlock } from '../components/block';
import { HighlightedValuesTable } from '../components/highlighted_values_table';
import { useIOCDetailsContext } from '../context';

export const INDICATORS_FLYOUT_OVERVIEW_TITLE = 'tiFlyoutOverviewTitle';
export const INDICATORS_FLYOUT_OVERVIEW_TABLE = 'tiFlyoutOverviewTableRow';
export const INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS = 'tiFlyoutOverviewHighLevelBlocks';

const highLevelFields = [
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.MarkingTLP,
  RawIndicatorFieldId.Confidence,
];

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(() => {
  const { indicator } = useIOCDetailsContext();
  const { openRightPanel } = useExpandableFlyoutApi();

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

  const title: string | null = getIndicatorFieldAndValue(indicator, RawIndicatorFieldId.Name).value;

  const onViewAllFieldsInTable = useCallback(
    () =>
      openRightPanel({
        id: IOCRightPanelKey,
        path: { tab: 'table' },
        params: {
          id: indicator._id,
        },
      }),
    [indicator._id, openRightPanel]
  );

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
          <EuiButtonEmpty onClick={onViewAllFieldsInTable}>
            <FormattedMessage
              id="xpack.securitySolution.threatIntelligence.indicator.flyoutOverviewTable.viewAllFieldsInTable"
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
});

OverviewTab.displayName = 'OverviewTab';
