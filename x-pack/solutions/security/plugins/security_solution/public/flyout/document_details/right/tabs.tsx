/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { SECURITY_CELL_ACTIONS_DETAILS_FLYOUT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import type { RightPanelPaths } from '.';
import { JsonTab } from '../../../flyout_v2/document/main/tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from '../../../flyout_v2/document/main/tabs/table_tab';
import type { CellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import { CellActionsMode, SecurityCellActions } from '../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../helpers';
import { useDocumentDetailsContext } from '../shared/context';

export interface RightPanelTabType {
  id: RightPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

/**
 * Cell action renderer for the document details flyout Table tab. Uses the `detailsFlyout` trigger,
 * which (unlike the `default` trigger) also registers the `toggleColumn`/`toggleUserAssetField`
 * actions, so the flyout keeps its full set of cell actions (6 visible on a typical field).
 */
const detailsFlyoutCellActionRenderer: CellActionRenderer = ({ field, value, children, scopeId }) => (
  <SecurityCellActions
    data={{ field, value: value ?? [] }}
    triggerId={SECURITY_CELL_ACTIONS_DETAILS_FLYOUT}
    mode={CellActionsMode.HOVER_DOWN}
    visibleCellActions={6}
    sourcererScopeId={getSourcererScopeId(scopeId)}
    metadata={{ scopeId }}
  >
    {children}
  </SecurityCellActions>
);

/**
 * Adapter that bridges the expandable flyout's `DocumentDetailsContext` to the prop-based
 * `TableTab` that now lives in `flyout_v2`. The table logic has a single source of truth in
 * `flyout_v2`; this component only reads the context and forwards the values as props.
 */
const TableTabContent = memo(() => {
  const { searchHit, scopeId, isRulePreview } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  return (
    <TableTab
      hit={hit}
      scopeId={scopeId}
      isRulePreview={isRulePreview}
      renderCellActions={detailsFlyoutCellActionRenderer}
    />
  );
});
TableTabContent.displayName = 'TableTabContent';

/**
 * Adapter that bridges the expandable flyout's `DocumentDetailsContext` to the prop-based
 * `JsonTab` that now lives in `flyout_v2`.
 */
const JsonTabContent = memo(() => {
  const { searchHit, isRulePreview } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  return <JsonTab hit={hit} isRulePreview={isRulePreview} />;
});
JsonTabContent.displayName = 'JsonTabContent';

export const overviewTab: RightPanelTabType = {
  id: 'overview',
  'data-test-subj': OVERVIEW_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.overviewTabLabel"
      defaultMessage="Overview"
    />
  ),
  content: <OverviewTab />,
};

export const tableTab: RightPanelTabType = {
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: <TableTabContent />,
};

export const jsonTab: RightPanelTabType = {
  id: 'json',
  'data-test-subj': JSON_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.header.jsonTabLabel"
      defaultMessage="JSON"
    />
  ),
  content: <JsonTabContent />,
};
