/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { RawIndicatorFieldId } from '../../../../../../common/threat_intelligence/types/indicator';
import { unwrapValue } from '../../utils/unwrap_value';
import { IndicatorFieldsTable } from './fields_table';

/**
 * Pick indicator fields starting with the indicator type
 */
const byIndicatorType = (indicatorType: string) => (field: string) =>
  field.startsWith(`threat.indicator.${indicatorType}`) ||
  [
    'threat.indicator.reference',
    'threat.indicator.description',
    'threat.software.alias',
    'threat.indicator.confidence',
    'threat.tactic.name',
    'threat.tactic.reference',
  ].includes(field);

interface HighlightedValuesTableProps {
  indicator: Indicator;
  ['data-test-subj']?: string;
}

/**
 * Displays highlighted indicator values based on indicator type
 */
export const HighlightedValuesTable: FC<HighlightedValuesTableProps> = ({
  indicator,
  'data-test-subj': dataTestSubj,
}) => {
  const indicatorType = unwrapValue(indicator, RawIndicatorFieldId.Type);

  const highlightedFields: string[] = useMemo(
    () => Object.keys(indicator.fields).filter(byIndicatorType(indicatorType || '')),
    [indicator.fields, indicatorType]
  );

  return (
    <IndicatorFieldsTable
      indicator={indicator}
      fields={highlightedFields}
      data-test-subj={dataTestSubj}
    />
  );
};
