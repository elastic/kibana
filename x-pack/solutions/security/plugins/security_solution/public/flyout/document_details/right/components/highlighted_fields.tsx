/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { convertHighlightedFieldsToTableRow } from '../../shared/utils/highlighted_fields_helpers';
import { HighlightedFieldsCell } from './highlighted_fields_cell';
import { CellActions } from '../../shared/components/cell_actions';
import { HIGHLIGHTED_FIELDS_DETAILS_TEST_ID, HIGHLIGHTED_FIELDS_TITLE_TEST_ID } from './test_ids';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { EditHighlightedFieldsButton } from './highlighted_fields_button';

export interface HighlightedFieldsTableRow {
  /**
   * Highlighted field name (overrideField or if null, falls back to id)
   */
  field: string;
  description: {
    /**
     * Highlighted field name (overrideField or if null, falls back to id)
     */
    field: string;
    /**
     * Highlighted field's original name, when the field is overridden
     */
    originalField?: string;
    /**
     * Highlighted field value
     */
    values: string[] | null | undefined;
    /**
     * Maintain backwards compatibility // TODO remove when possible
     * Only needed if alerts page flyout (which uses CellActions), NOT in EASE alert summary flyout.
     */
    scopeId: string;
    /**
     * If true, cell actions will be shown on hover
     */
    showCellActions: boolean;
    /**
     * The indexName to be passed to the flyout preview panel
     * when clicking on "Source event" id
     */
    ancestorsIndexName?: string;
  };
}

const columns: Array<EuiBasicTableColumn<HighlightedFieldsTableRow>> = [
  {
    field: 'field',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.investigation.highlightedFields.tableFieldColumnLabel"
        defaultMessage="Field"
      />
    ),
    'data-test-subj': 'fieldCell',
    width: '30%',
  },
  {
    field: 'description',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.investigation.highlightedFields.tableValueColumnLabel"
        defaultMessage="Value"
      />
    ),
    'data-test-subj': 'valueCell',
    width: '70%',
    render: (description: {
      field: string;
      originalField?: string;
      values: string[] | null | undefined;
      scopeId: string;
      isPreview: boolean;
      showCellActions: boolean;
      ancestorsIndexName?: string;
    }) => (
      <>
        {description.showCellActions ? (
          <CellActions field={description.field} value={description.values}>
            <HighlightedFieldsCell
              values={description.values}
              field={description.field}
              originalField={description.originalField}
              scopeId={description.scopeId}
              showPreview={true}
              ancestorsIndexName={description.ancestorsIndexName}
            />
          </CellActions>
        ) : (
          <HighlightedFieldsCell
            values={description.values}
            field={description.field}
            originalField={description.originalField}
          />
        )}
      </>
    ),
  },
];

export interface HighlightedFieldsProps {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
  /**
   * Maintain backwards compatibility // TODO remove when possible
   * Only needed if alerts page flyout (which uses CellActions), NOT in EASE alert summary flyout.
   */
  scopeId?: string;
  /**
   * If true, cell actions will be shown on hover.
   * This is false for EASE alert summary page and true for the alerts page.
   */
  showCellActions: boolean;
  /**
   * If true, the edit button will be shown on hover.
   * This is false by default (for EASE alert summary page) and will be true for the alerts page.
   */
  showEditButton?: boolean;
  /**
   * The indexName to be passed to the flyout preview panel
   * when clicking on "Source event" id
   */
  ancestorsIndexName?: string;
}

/**
 * Component that displays the highlighted fields in the right panel under the Investigation section.
 * It is used in both in the alerts page and EASE alert summary page. The latter has no CellActions enabled.
 */
export const HighlightedFields = memo(
  ({
    dataFormattedForFieldBrowser,
    investigationFields,
    scopeId = '',
    showCellActions,
    showEditButton = false,
    ancestorsIndexName,
  }: HighlightedFieldsProps) => {
    const [isEditLoading, setIsEditLoading] = useState(false);

    const highlightedFields = useHighlightedFields({
      dataFormattedForFieldBrowser,
      investigationFields,
    });

    const items = useMemo(
      () =>
        convertHighlightedFieldsToTableRow(
          highlightedFields,
          scopeId,
          showCellActions,
          ancestorsIndexName
        ),
      [highlightedFields, scopeId, showCellActions, ancestorsIndexName]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" css={{ minHeight: '40px' }}>
            <EuiFlexItem data-test-subj={HIGHLIGHTED_FIELDS_TITLE_TEST_ID}>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.investigation.highlightedFields.highlightedFieldsTitle"
                    defaultMessage="Highlighted fields"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            {showEditButton && (
              <EuiFlexItem grow={false}>
                <EditHighlightedFieldsButton
                  customHighlightedFields={investigationFields}
                  dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
                  setIsEditLoading={setIsEditLoading}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj={HIGHLIGHTED_FIELDS_DETAILS_TEST_ID}>
          <EuiPanel hasBorder hasShadow={false}>
            <EuiInMemoryTable
              items={items}
              columns={columns}
              compressed
              loading={isEditLoading}
              tableCaption={i18n.translate(
                'xpack.securitySolution.flyout.right.investigation.highlightedFields.highlightedFieldsCaption',
                {
                  defaultMessage: 'Highlighted fields',
                }
              )}
              noItemsMessage={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.investigation.highlightedFields.noDataDescription"
                  defaultMessage="There's no highlighted fields for this alert."
                />
              }
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

HighlightedFields.displayName = 'HighlightedFields';
