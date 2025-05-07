/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiPanel, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { convertHighlightedFieldsToTableRow } from '../../shared/utils/highlighted_fields_helpers';
import { HighlightedFieldsCell } from './highlighted_fields_cell';
import { CellActions } from '../../shared/components/cell_actions';
import { HIGHLIGHTED_FIELDS_DETAILS_TEST_ID, HIGHLIGHTED_FIELDS_TITLE_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { useHighlightedFields } from '../../shared/hooks/use_highlighted_fields';
import { EditHighlightedFieldsButton } from './highlighted_fields_button';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

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
     */
    scopeId: string;
    /**
     * Boolean to indicate this field is shown in a preview
     */
    isPreview: boolean;
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
    }) => (
      <CellActions field={description.field} value={description.values}>
        <HighlightedFieldsCell
          values={description.values}
          field={description.field}
          originalField={description.originalField}
        />
      </CellActions>
    ),
  },
];

/**
 * Component that displays the highlighted fields in the right panel under the Investigation section.
 */
export const HighlightedFields: FC = () => {
  const { dataFormattedForFieldBrowser, scopeId, isPreview, investigationFields } =
    useDocumentDetailsContext();

  const [isEditLoading, setIsEditLoading] = useState(false);
  const editHighlightedFieldsEnabled = useIsExperimentalFeatureEnabled(
    'editHighlightedFieldsEnabled'
  );

  const highlightedFields = useHighlightedFields({
    dataFormattedForFieldBrowser,
    investigationFields,
  });
  const items = useMemo(
    () => convertHighlightedFieldsToTableRow(highlightedFields, scopeId, isPreview),
    [highlightedFields, scopeId, isPreview]
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
          {editHighlightedFieldsEnabled && (
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
            message={
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
};
