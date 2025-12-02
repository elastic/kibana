/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldSpec } from '@kbn/data-plugin/common';

import { css } from '@emotion/react';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { getFieldFormat } from '../../document_details/right/utils/get_field_format';
import { useExpandableValues } from '../../document_details/shared/hooks/use_expandable_values';

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
  /**
   * Optional: limit how many values to show before "Show more"
   */
  displayValuesLimit?: number;
}

/**
 * Renders the value of a field in the second column of the table
 */
export const TableFieldValueCell = memo(
  ({
    data,
    attackId,
    fieldFromBrowserField,
    values,
    displayValuesLimit = 2,
  }: FieldValueCellProps) => {
    const {
      visibleValues,
      overflownValues,
      isContentExpanded,
      isContentTooLarge,
      toggleContentExpansion,
    } = useExpandableValues({ values, displayValuesLimit });

    if (values == null) {
      return null;
    }

    const renderValue = (value: string, i: number) => {
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
    };

    return (
      <EuiFlexGroup
        data-test-subj={`attack-field-${data.field}`}
        direction="column"
        gutterSize="xs"
      >
        {visibleValues.map((value, i) => renderValue(value, i))}
        {isContentExpanded &&
          overflownValues.map((value, i) =>
            // keys stay unique
            renderValue(value, i + visibleValues.length)
          )}
        {isContentTooLarge && (
          <EuiFlexItem
            grow={false}
            css={css`
              align-self: flex-start;
              width: auto;
            `}
          >
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={toggleContentExpansion}
              data-test-subj="attack-field-toggle-show-more-button"
            >
              {isContentExpanded ? (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.alertsHighlightedField.showMore"
                  defaultMessage="Show less"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.alertsHighlightedField.showLess"
                  defaultMessage="Show more"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

TableFieldValueCell.displayName = 'TableFieldValueCell';
