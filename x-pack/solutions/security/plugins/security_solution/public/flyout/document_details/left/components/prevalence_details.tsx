/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import {
  PREVALENCE_DETAILS_TABLE_PREVIEW_LINK_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
} from '../../../../flyout_v2/document/tools/prevalence/test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreviewLink } from '../../../shared/components/preview_link';
import { CellActions } from '../../shared/components/cell_actions';
import type { IdentityFields } from '../../shared/utils';
import { PrevalenceDetailsView } from '../../../../flyout_v2/document/tools/prevalence/components/prevalence_details_view';
import type { PrevalenceDetailsRow } from '../../../../flyout_v2/document/tools/prevalence/utils/get_columns';
import {
  alertCountColumn,
  documentCountColumn,
  fieldColumn,
  hostPrevalenceColumn,
  userPrevalenceColumn,
} from '../../../../flyout_v2/document/tools/prevalence/utils/get_columns';

export const PREVALENCE_TAB_ID = 'prevalence';

// We reuse as many columns as possible, but we have a custom render for the value column to wrap values in CellActions and add a PreviewLink.
// This is necessary to preserve the old flyout's functionality while we transition to the new flyout.
const columns: Array<EuiBasicTableColumn<PrevalenceDetailsRow>> = [
  fieldColumn,
  {
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.prevalence.valueColumnLabel"
        defaultMessage="Value"
      />
    ),
    'data-test-subj': PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
    render: (data: PrevalenceDetailsRow) => (
      <EuiFlexGroup direction="column" gutterSize="none">
        {data.values.map((value) => {
          const linkIdentityFields: IdentityFields =
            data.field === 'host.name' && data.documentHostEntityIdentifiers
              ? data.documentHostEntityIdentifiers
              : data.field === 'user.name' && data.documentUserEntityIdentifiers
              ? data.documentUserEntityIdentifiers
              : { [data.field]: value };
          return (
            <EuiFlexItem key={value}>
              <CellActions field={data.field} value={value}>
                <PreviewLink
                  field={data.field}
                  value={value}
                  identityFields={linkIdentityFields}
                  scopeId={data.scopeId}
                  data-test-subj={PREVALENCE_DETAILS_TABLE_PREVIEW_LINK_CELL_TEST_ID}
                >
                  <EuiText size="xs">{value}</EuiText>
                </PreviewLink>
              </CellActions>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    ),
    width: '20%',
  },
  alertCountColumn(true),
  documentCountColumn(true),
  hostPrevalenceColumn,
  userPrevalenceColumn,
];

/**
 * Prevalence table displayed in the document details expandable flyout left section under the Insights tab.
 * This is a thin wrapper that provides values from context and passes the old-flyout CellActions as renderCellActions.
 */
export const PrevalenceDetails: React.FC = () => {
  const { investigationFields, scopeId, searchHit } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <PrevalenceDetailsView
        hit={hit}
        investigationFields={investigationFields}
        scopeId={scopeId}
        columns={columns}
      />
    </EuiPanel>
  );
};

PrevalenceDetails.displayName = 'PrevalenceDetails';
