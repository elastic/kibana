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
import { getFieldFormat } from '../utils/get_field_format';
import type { EventFieldsData } from '../../../common/components/event_details/types';
import { OverflowField } from '../../../common/components/tables/helpers';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { MESSAGE_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { FLYOUT_TABLE_PREVIEW_LINK_FIELD_TEST_ID } from '../../../flyout/document_details/right/components/test_ids';
import { isFlyoutLink } from '../../../flyout/shared/utils/link_utils';
import { PreviewLink } from '../../../flyout/shared/components/preview_link';
import type { OpenFlyoutLinkRenderer } from './open_flyout_link';

export interface FieldValueCellProps {
  /**
   * Value used to create a unique identifier in children components
   */
  scopeId: string;
  /**
   * Datq retrieved from the row
   */
  data: EventFieldsData;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Field retrieved from the BrowserField
   */
  fieldFromBrowserField?: Partial<FieldSpec>;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Whether the preview link is in rule preview
   */
  isRulePreview: boolean;
  /**
   * Value of the link field if it exists. Allows to navigate to other pages like host, user, network...
   */
  getLinkValue?: (field: string) => string | null;
  /**
   * Values for the field, to render in the second column of the table
   */
  values: string[] | null | undefined;
  /**
   * Entity Store canonical id for host/user preview navigation when known
   */
  entityId?: string;
  /**
   * The source document record, forwarded to the flyout link for entity resolution (new flyout).
   */
  hit?: DataTableRecord;
  /**
   * Optional wrapper that renders a preview link for supported field types (host, ip, rule).
   * Injected by the caller so each flyout context controls its own navigation. When provided
   * (new flyout), it is used instead of the legacy expandable-flyout `PreviewLink`.
   */
  renderFlyoutLink?: OpenFlyoutLinkRenderer;
}

/**
 * Renders the value of a field in the second column of the table
 */
export const TableFieldValueCell = memo(
  ({
    scopeId,
    data,
    eventId,
    fieldFromBrowserField,
    ruleId,
    getLinkValue,
    values,
    isRulePreview,
    entityId,
    hit,
    renderFlyoutLink: RenderFlyoutLink,
  }: FieldValueCellProps) => {
    if (values == null) {
      return null;
    }

    const isLink = isFlyoutLink({ field: data.field, ruleId, scopeId });

    return (
      <EuiFlexGroup data-test-subj={`event-field-${data.field}`} direction="column" gutterSize="xs">
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

          let content: React.ReactNode;
          if (data.field === MESSAGE_FIELD_NAME) {
            content = <OverflowField value={value} />;
          } else if (isLink && !RenderFlyoutLink) {
            // Legacy expandable flyout: open the preview panel.
            content = (
              <PreviewLink
                field={data.field}
                value={value}
                entityId={entityId}
                scopeId={scopeId}
                ruleId={ruleId}
                data-test-subj={`${FLYOUT_TABLE_PREVIEW_LINK_FIELD_TEST_ID}-${i}`}
              />
            );
          } else if (isLink && RenderFlyoutLink) {
            // New flyout: render the plain value; the `RenderFlyoutLink` wrapper below turns it
            // into a link that opens the relevant system flyout (host, ip, rule).
            content = <EuiText size="xs">{value}</EuiText>;
          } else {
            content = (
              <FormattedFieldValue
                contextId={`${scopeId}-${eventId}-${data.field}-${i}-${value}`}
                eventId={eventId}
                fieldFormat={getFieldFormat(data)}
                fieldName={data.field}
                fieldFromBrowserField={fieldFromBrowserField}
                fieldType={data.type}
                isAggregatable={fieldFromBrowserField.aggregatable}
                isObjectArray={data.isObjectArray}
                value={value}
                linkValue={getLinkValue && getLinkValue(data.field)}
                truncate={false}
              />
            );
          }

          return (
            <EuiFlexItem grow={false} key={`${i}-${value}`}>
              {RenderFlyoutLink ? (
                <RenderFlyoutLink field={data.field} value={value} hit={hit}>
                  {content}
                </RenderFlyoutLink>
              ) : (
                content
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  }
);

TableFieldValueCell.displayName = 'TableFieldValueCell';
