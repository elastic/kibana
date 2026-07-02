/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldFormat } from '../../../flyout/document_details/right/utils/get_field_format';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { OverflowField } from '../../../common/components/tables/helpers';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { MESSAGE_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { FLYOUT_TABLE_PREVIEW_LINK_FIELD_TEST_ID } from '../../../flyout/document_details/right/components/test_ids';
import { isFlyoutLink } from '../../../flyout/shared/utils/link_utils';
import { PreviewLink } from '../../../flyout/shared/components/preview_link';
import type { OpenFlyoutLinkProps } from '../components/open_flyout_link';

/**
 * Renderer that wraps a value in a link opening the new (v2) system flyout for
 * supported fields (e.g. `OpenFlyoutLink`). Passing this switches the cell into
 * v2 linking mode.
 */
export type OpenFlyoutLinkRenderer = React.FC<OpenFlyoutLinkProps>;

export interface TableFieldValueCellProps {
  /**
   * Field name for the row.
   */
  field: string;
  /**
   * Values for the field, rendered in the value column (one entry per line).
   */
  values: string[] | null | undefined;
  /**
   * Scope id used by cell actions and links.
   */
  scopeId?: string;
  /**
   * Row data from the field browser (holds `type`, `isObjectArray`). Required for
   * v1 formatting; omit in v2 mode where values render as plain text or links.
   */
  data?: EventFieldsData;
  /**
   * Document id, used by v1 `FormattedFieldValue`.
   */
  eventId?: string;
  /**
   * The field spec resolved from the browser fields. When absent, v1 mode renders
   * plain text (no formatting/links).
   */
  fieldFromBrowserField?: Partial<FieldSpec>;
  /**
   * Rule id, used to decide whether a field is a rule-scoped flyout link (v1).
   */
  ruleId?: string;
  /**
   * Whether the value is rendered inside a rule preview (v1).
   */
  isRulePreview?: boolean;
  /**
   * Resolves the link (navigation) value for a field, e.g. the rule UUID behind a
   * rule name. Used by v1 `FormattedFieldValue`.
   */
  getLinkValue?: (field: string) => string | null;
  /**
   * Entity Store id for host/user preview navigation (v1).
   */
  entityId?: string;
  /**
   * When provided, switches to v2 linking: each value is wrapped in this renderer
   * (e.g. `OpenFlyoutLink`), which links supported fields and passes the rest through.
   */
  renderFlyoutLink?: OpenFlyoutLinkRenderer;
  /**
   * Source document, forwarded to `renderFlyoutLink` for entity resolution (v2).
   */
  hit?: DataTableRecord;
}

/**
 * Renders the value(s) of a document field in the flyout table's value column.
 *
 * Two linking modes, chosen by the caller:
 * - v1 (legacy expandable flyout): pass `fieldFromBrowserField`/`data`/`getLinkValue`/
 *   `ruleId`/`entityId`. Values are formatted via `FormattedFieldValue` and linked via
 *   `PreviewLink` for supported fields.
 * - v2 (new flyout system): pass `renderFlyoutLink` (and `hit`). Each value is wrapped so
 *   supported fields open the relevant system flyout; unsupported fields render as text.
 */
export const TableFieldValueCell = memo(
  ({
    field,
    values,
    scopeId = '',
    data,
    eventId = '',
    fieldFromBrowserField,
    ruleId = '',
    isRulePreview = false,
    getLinkValue,
    entityId,
    renderFlyoutLink: RenderFlyoutLink,
    hit,
  }: TableFieldValueCellProps) => {
    if (values == null) {
      return null;
    }

    return (
      <EuiFlexGroup data-test-subj={`event-field-${field}`} direction="column" gutterSize="xs">
        {values.map((value, i) => {
          // v2 mode: let the flyout-link renderer decide whether/how to link the value.
          if (RenderFlyoutLink) {
            return (
              <EuiFlexItem grow={false} key={`${i}-${value}`}>
                <RenderFlyoutLink field={field} value={value} hit={hit}>
                  {value}
                </RenderFlyoutLink>
              </EuiFlexItem>
            );
          }

          // v1 mode: plain text when there is no browser-field metadata to format with.
          if (fieldFromBrowserField == null || data == null) {
            return (
              <EuiFlexItem grow={false} key={`${i}-${value}`}>
                <EuiText size="xs">{value}</EuiText>
              </EuiFlexItem>
            );
          }

          return (
            <EuiFlexItem grow={false} key={`${i}-${value}`}>
              {field === MESSAGE_FIELD_NAME ? (
                <OverflowField value={value} />
              ) : isFlyoutLink({ field, ruleId, scopeId }) ? (
                <PreviewLink
                  field={field}
                  value={value}
                  entityId={entityId}
                  scopeId={scopeId}
                  ruleId={ruleId}
                  data-test-subj={`${FLYOUT_TABLE_PREVIEW_LINK_FIELD_TEST_ID}-${i}`}
                />
              ) : (
                <FormattedFieldValue
                  contextId={`${scopeId}-${eventId}-${field}-${i}-${value}`}
                  eventId={eventId}
                  fieldFormat={getFieldFormat(data)}
                  fieldName={field}
                  fieldFromBrowserField={fieldFromBrowserField}
                  fieldType={data.type}
                  isAggregatable={fieldFromBrowserField.aggregatable}
                  isObjectArray={data.isObjectArray}
                  value={value}
                  linkValue={getLinkValue && getLinkValue(field)}
                  truncate={false}
                />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

TableFieldValueCell.displayName = 'TableFieldValueCell';
