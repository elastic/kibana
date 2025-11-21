/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { isArray } from 'lodash';
import { useFieldTypes } from '../../../../hooks/use_field_types';
import { EMPTY_VALUE } from '../../../../constants/common';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { RawIndicatorFieldId } from '../../../../../../common/threat_intelligence/types/indicator';
import { DateFormatter } from '../../../../components/date_formatter';
import { unwrapValue } from '../../utils/unwrap_value';
import { TLPBadge } from './tlp_badge';

export interface IndicatorFieldValueProps {
  /**
   * Indicator to display the field value from (see {@link Indicator}).
   */
  indicator: Indicator;
  /**
   * The field to get the indicator's value for.
   */
  field: string;
}

/**
 * Renders an indicator field value based on its type:
 * - TLP fields → `<TLPBadge />`
 * - Date fields → `<DateFormatter />`
 * - Missing value → {@link EMPTY_VALUE}
 * - String or string[] → renders each value in a vertical column
 */

export const IndicatorFieldValue: FC<IndicatorFieldValueProps> = ({ indicator, field }) => {
  const fieldType = useFieldTypes()[field];
  const value = unwrapValue(indicator, field as RawIndicatorFieldId);

  if (field === RawIndicatorFieldId.MarkingTLP && !isArray(value)) {
    return <TLPBadge value={value} />;
  }

  if (fieldType === 'date') {
    return <DateFormatter date={value as string} />;
  }

  if (!value) {
    return EMPTY_VALUE;
  }

  const values = [value].flat();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
      `}
    >
      {values.map((val, idx) => (
        <span key={`${value}-${idx}`}>{val}</span>
      ))}
    </div>
  );
};
