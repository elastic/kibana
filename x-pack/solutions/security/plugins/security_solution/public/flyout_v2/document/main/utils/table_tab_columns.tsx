/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiText, EuiToolTip, type EuiBasicTableColumn } from '@elastic/eui';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldFromBrowserField } from '../tabs/table_tab';
import { TableFieldNameCell } from '../../../shared/components/table_field_name_cell';
import { TableFieldValueCell } from '../../../shared/components/table_field_value_cell';
import type { EventFieldsData } from '../../../../common/components/event_details/types';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import type { OpenFlyoutLinkRenderer } from '../../../shared/components/open_flyout_link';
import { FLYOUT_TABLE_PIN_ACTION_TEST_ID } from '../../../../flyout/document_details/right/components/test_ids';

export const FIELD = i18n.translate('xpack.securitySolution.flyout.table.fieldCellLabel', {
  defaultMessage: 'Field',
});
const VALUE = i18n.translate('xpack.securitySolution.flyout.table.valueCellLabel', {
  defaultMessage: 'Value',
});

const PIN = i18n.translate('xpack.securitySolution.flyout.table.pinCellLabel', {
  defaultMessage: 'Pin',
});

const UNPIN = i18n.translate('xpack.securitySolution.flyout.table.unpinCellLabel', {
  defaultMessage: 'Unpin',
});

export type ColumnsProvider = (providerOptions: {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Whether the preview link is in preview mode
   */
  isRulePreview: boolean;
  /**
   * Value of the link field if it exists. Allows to navigate to other pages like host, user, network...
   */
  getLinkValue: (field: string) => string | null;
  /**
   * Function to toggle pinned fields
   */
  onTogglePinned: (field: string, action: 'pin' | 'unpin') => void;
  /**
   * Resolved entity store id for host/user preview links for this document
   */
  entityId?: string;
  /**
   * Wraps each value cell with cell actions (filter for/out, copy, etc.). The caller decides
   * what to inject (real security cell actions in Security Solution, no-op elsewhere).
   */
  renderCellActions: CellActionRenderer;
  /**
   * The source document record, forwarded to the flyout link for entity resolution (new flyout).
   */
  hit: DataTableRecord;
  /**
   * Optional wrapper that renders a preview link for supported field types (host, ip, rule).
   * Injected by the caller: the new flyout passes `OpenFlyoutLink`, the legacy flyout omits it
   * so the value cell keeps using the expandable-flyout `PreviewLink`.
   */
  renderFlyoutLink?: OpenFlyoutLinkRenderer;
}) => Array<EuiBasicTableColumn<TimelineEventsDetailsItem>>;

/**
 * Returns the columns for the table tab
 */
export const getTableTabColumns: ColumnsProvider = ({
  browserFields,
  eventId,
  scopeId,
  getLinkValue,
  ruleId,
  isRulePreview,
  onTogglePinned,
  entityId,
  renderCellActions,
  hit,
  renderFlyoutLink,
}) => [
  {
    name: ' ',
    field: 'isPinned',
    render: (isPinned: boolean, data: TimelineEventsDetailsItem) => {
      return (
        <EuiToolTip content={isPinned ? UNPIN : PIN} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={isPinned ? UNPIN : PIN}
            className={isPinned ? 'flyout_table__unPinAction' : 'flyout_table__pinAction'}
            iconType={isPinned ? 'pinFill' : 'pin'}
            color="text"
            iconSize="m"
            onClick={() => {
              onTogglePinned(data.field, isPinned ? 'unpin' : 'pin');
            }}
            data-test-subj={FLYOUT_TABLE_PIN_ACTION_TEST_ID}
          />
        </EuiToolTip>
      );
    },
    width: '32px',
  },
  {
    field: 'field',
    name: (
      <EuiText size="xs">
        <strong>{FIELD}</strong>
      </EuiText>
    ),
    width: '30%',
    render: (field, data) => {
      return <TableFieldNameCell dataType={(data as EventFieldsData).type} field={field} />;
    },
  },
  {
    field: 'values',
    name: (
      <EuiText size="xs">
        <strong>{VALUE}</strong>
      </EuiText>
    ),
    render: (values, data) => {
      const fieldFromBrowserField = getFieldFromBrowserField(data.field, browserFields);
      return renderCellActions({
        field: data.field,
        value: values,
        scopeId,
        children: (
          <TableFieldValueCell
            scopeId={scopeId}
            data={data as EventFieldsData}
            eventId={eventId}
            fieldFromBrowserField={fieldFromBrowserField}
            getLinkValue={getLinkValue}
            ruleId={ruleId}
            isRulePreview={isRulePreview}
            values={values}
            entityId={entityId}
            hit={hit}
            renderFlyoutLink={renderFlyoutLink}
          />
        ),
      });
    },
  },
];
