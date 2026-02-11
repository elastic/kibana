/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import {
  EuiBasicTable,
  EuiPanel,
  EuiTitle,
  EuiLink,
  EuiLoadingChart,
  EuiSpacer,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { AttackDetailsRightPanelKey } from '../../../../../flyout/attack_details/constants/panel_keys';
import { useAttacksListData } from './use_attacks_list_data';
import type { AttacksListItem } from './types';

const PAGE_SIZE = 10;
const TABLE_WIDTH = 385;
const TABLE_HEIGHT = 200;

const TableContainer = styled.div`
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

export interface AttacksListPanelProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
  /** DataView for the attacks page */
  dataView: DataView;
}

/**
 * Renders the attacks list panel
 * @param props - The props for the component
 * @returns The attacks list panel
 */
export const AttacksListPanel = React.memo<AttacksListPanelProps>(
  ({ filters, query, dataView }) => {
    const { openFlyout } = useExpandableFlyoutApi();

    const { items, isLoading, pageIndex, setPageIndex, pageSize, setPageSize, total } =
      useAttacksListData({
        filters,
        query,
        pageSize: PAGE_SIZE,
      });

    const columns = useMemo<EuiBasicTableColumn<AttacksListItem>[]>(
      () => [
        {
          field: 'name',
          name: i18n.translate(
            'xpack.securitySolution.attacksPage.attacksListPanel.attackNameColumn',
            {
              defaultMessage: 'Attack name',
            }
          ),
          render: (name: string, item: AttacksListItem) => (
            <EuiLink
              className="eui-textTruncate"
              onClick={() => {
                openFlyout({
                  right: {
                    id: AttackDetailsRightPanelKey,
                    params: {
                      attackId: item.id,
                      indexName: dataView.getIndexPattern(),
                    },
                  },
                });
              }}
              title={name}
            >
              {name}
            </EuiLink>
          ),
        },
        {
          field: 'alertsCount',
          name: i18n.translate(
            'xpack.securitySolution.attacksPage.attacksListPanel.alertCountColumn',
            {
              defaultMessage: 'Alerts count',
            }
          ),
          width: '100px',
          align: 'center',
        },
      ],
      [dataView, openFlyout]
    );

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount: total,
    };

    const onTableChange = ({ page }: Criteria<AttacksListItem>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    };

    return (
      <EuiPanel
        hasBorder
        style={{
          width: TABLE_WIDTH,
          height: TABLE_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.securitySolution.attacksPage.attacksListPanel.title', {
              defaultMessage: '{total} attacks detected',
              values: { total },
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <TableContainer>
          {isLoading ? (
            <EuiLoadingChart size="xl" />
          ) : (
            <EuiBasicTable<AttacksListItem>
              items={items}
              columns={columns}
              pagination={pagination}
              onChange={onTableChange}
              compressed
              tableCaption={i18n.translate(
                'xpack.securitySolution.attacksPage.attacksListPanel.tableCaption',
                {
                  defaultMessage: 'List of attacks sorted by alert volume',
                }
              )}
            />
          )}
        </TableContainer>
      </EuiPanel>
    );
  }
);
AttacksListPanel.displayName = 'AttacksListPanel';
