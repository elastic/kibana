/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-plugin/common';

import type { EventFieldsData } from '../../../common/components/event_details/types';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { getFieldFormat } from '../../document_details/right/utils/get_field_format';

export interface FieldValueCellProps {
  /**
   * Data retrieved from the row
   */
  data: EventFieldsData;
  /**
   * Id of the attack document
   */
  attackId: string;
  /**
   * Field retrieved from the BrowserField
   */
  fieldFromBrowserField?: Partial<FieldSpec>;
  /**
   * Values for the field, to render in the second column of the table
   */
  values: string[] | null | undefined;
}

/**
 * Renders the value of a field in the second column of the table
 */
export const TableFieldValueCell = memo(
  ({ data, attackId, fieldFromBrowserField, values }: FieldValueCellProps) => {
    if (values == null) {
      return null;
    }

    return (
      <EuiFlexGroup
        data-test-subj={`attack-field-${data.field}`}
        direction="column"
        gutterSize="xs"
      >
        {values.map((value, i) => {
          if (fieldFromBrowserField == null) {
            return (
              <EuiFlexItem grow={false} key={`${i}-${value}`}>
                <EuiText size="xs" key={`${i}-${value}`}>
                  {value}
                </EuiText>
              </EuiFlexItem>
            );
          }

          return (
            <EuiFlexItem grow={false} key={`${i}-${value}`}>
              <FormattedFieldValue
                contextId={`${attackId}-${data.field}-${i}-${value}`}
                eventId={attackId}
                fieldFormat={getFieldFormat(data)}
                fieldName={data.field}
                fieldFromBrowserField={fieldFromBrowserField}
                fieldType={data.type}
                isAggregatable={fieldFromBrowserField.aggregatable}
                isObjectArray={data.isObjectArray}
                value={value}
                truncate={false}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

TableFieldValueCell.displayName = 'TableFieldValueCell';
