/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo, useState } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { JsonTab } from '../../../../flyout_v2/document/main/tabs/json_tab';
import { TableTab } from '../../../../flyout_v2/document/main/tabs/table_tab';
import { cellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { useDocumentDetailsContext } from '../../../document_details/shared/context';
import { FLYOUT_BODY_TEST_ID, JSON_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './test_ids';
import { FlyoutBody } from '../../../shared/components/flyout_body';

export interface AssetDocumentPanelProps extends FlyoutPanelProps {
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
  };
}

const useFilterOptions = (
  tabs: Array<{ id: string; name: React.ReactElement }>
): EuiButtonGroupOptionProps[] =>
  useMemo(
    () =>
      tabs.map((tab) => {
        return {
          id: tab.id,
          label: tab.name,
        };
      }),
    [tabs]
  );

export const AssetDocumentTab: FC<Partial<AssetDocumentPanelProps>> = memo(() => {
  const { searchHit, scopeId, isRulePreview } = useDocumentDetailsContext();

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  const tabs = useMemo(
    () => [
      {
        id: TABLE_TAB_TEST_ID,
        'data-test-subj': TABLE_TAB_TEST_ID,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.userDetails.tableTabLabel"
            defaultMessage="Table"
          />
        ),
        content: (
          <TableTab
            hit={hit}
            scopeId={scopeId}
            isRulePreview={isRulePreview}
            renderCellActions={cellActionRenderer}
          />
        ),
      },
      {
        id: JSON_TAB_TEST_ID,
        'data-test-subj': JSON_TAB_TEST_ID,
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.userDetails.jsonTabLabel"
            defaultMessage="JSON"
          />
        ),
        content: <JsonTab hit={hit} isRulePreview={isRulePreview} />,
      },
    ],
    [hit, scopeId, isRulePreview]
  );

  const [selectedTabId, setSelectedTabId] = useState<string>(tabs[0].id);
  const buttonButtons = useFilterOptions(tabs);
  const selectedTab = useMemo(() => {
    return tabs.find((tab) => tab.id === selectedTabId);
  }, [selectedTabId, tabs]);

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.userDetails.tabsLegend',
          {
            defaultMessage: 'Asset document tabs',
          }
        )}
        options={buttonButtons}
        idSelected={selectedTabId}
        onChange={setSelectedTabId}
        buttonSize="compressed"
        isFullWidth
      />
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>{selectedTab?.content}</FlyoutBody>
    </>
  );
});

AssetDocumentTab.displayName = 'AssetDocumentLeftPanel';
