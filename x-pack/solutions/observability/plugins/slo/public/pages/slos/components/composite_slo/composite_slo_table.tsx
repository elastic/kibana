/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
  type CriteriaWithPagination,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { sloListLocatorID, type SloListLocatorParams } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { observabilityAppId } from '@kbn/observability-plugin/common';
import { encode } from '@kbn/rison';
import type { CompositeSLODefinitionResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { displayStatus } from '../../../../components/slo/slo_badges/slo_status_badge';
import { useFetchActiveAlerts } from '../../../../hooks/use_fetch_active_alerts';
import { useFetchCompositeHistoricalSummary } from '../../../../hooks/use_fetch_composite_historical_summary';
import { useFetchCompositeSloDetails } from '../../../../hooks/use_fetch_composite_slo_details';
import type {
  CompositeSloSortBy,
  CompositeSloSortDirection,
} from '../../../../hooks/use_fetch_composite_slo_list';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import {
  SloBurnRateWindowColumnHeader,
  type SloBurnRateWindow,
} from '../common/slo_burn_rate_window_column_header';
import { SloSparkline } from '../slo_sparkline';
import { CompositeSloMembersTable } from './composite_slo_members_table';

type CompositeSLOItem = CompositeSLODefinitionResponse;

const SORTABLE_FIELDS: Record<string, CompositeSloSortBy> = {
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

interface Props {
  results: CompositeSLOItem[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
  };
  sort: {
    field: CompositeSloSortBy;
    direction: CompositeSloSortDirection;
  };
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onSortChange: (field: CompositeSloSortBy, direction: CompositeSloSortDirection) => void;
  onDelete: (item: CompositeSLOItem) => void;
}

export function CompositeSloTable({
  results,
  pagination,
  sort,
  onPageChange,
  onSortChange,
  onDelete,
}: Props) {
  const {
    uiSettings,
    application: { navigateToUrl, navigateToApp },
    http: { basePath },
    share,
  } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const sloListLocator = share?.url?.locators?.get<SloListLocatorParams>(sloListLocatorID);
  const { data: permissions } = usePermissions();
  const hasWritePermissions = permissions?.hasAllWriteRequested === true;

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [burnRateWindow, setBurnRateWindow] = useState<SloBurnRateWindow>('5m');
  const [isBurnRatePopoverOpen, setIsBurnRatePopoverOpen] = useState(false);
  const [openMemberHealthPopoverId, setOpenMemberHealthPopoverId] = useState<string | null>(null);

  const compositeIds = results.map((item) => item.id);
  const { detailsById, isLoading: isDetailsLoading } = useFetchCompositeSloDetails(compositeIds);
  const { historicalSummaryById, isLoading: isHistoricalLoading } =
    useFetchCompositeHistoricalSummary(compositeIds);

  const seenMemberKeys = new Set<string>();
  const memberSloIdsAndInstanceIds: Array<[string, string]> = [];
  for (const item of results) {
    for (const member of item.members) {
      const instanceId = member.instanceId ?? ALL_VALUE;
      const key = `${member.sloId}|${instanceId}`;
      if (!seenMemberKeys.has(key)) {
        seenMemberKeys.add(key);
        memberSloIdsAndInstanceIds.push([member.sloId, instanceId]);
      }
    }
  }

  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: memberSloIdsAndInstanceIds,
  });

  const toggleExpandRow = (item: CompositeSLOItem) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const expandedRows: Record<string, React.ReactNode> = {};
  for (const id of expandedRowIds) {
    const details = detailsById.get(id);
    if (!details || !details.members?.length) {
      expandedRows[id] = (
        <EuiText size="s" color="subdued" style={{ padding: 16 }}>
          {i18n.translate('xpack.slo.compositeSloList.noMembers', {
            defaultMessage: 'No member SLI data available',
          })}
        </EuiText>
      );
    } else {
      expandedRows[id] = (
        <CompositeSloMembersTable members={details.members} percentFormat={percentFormat} />
      );
    }
  }

  const columns: Array<EuiBasicTableColumn<CompositeSLOItem>> = [
    {
      width: '40px',
      isExpander: true,
      render: (item: CompositeSLOItem) => {
        const isExpanded = expandedRowIds.has(item.id);
        return (
          <EuiButtonIcon
            data-test-subj={`compositeSloExpandRow-${item.id}`}
            onClick={() => toggleExpandRow(item)}
            aria-label={
              isExpanded
                ? i18n.translate('xpack.slo.compositeSloList.collapseRowFor', {
                    defaultMessage: 'Collapse row: {name}',
                    values: { name: item.name },
                  })
                : i18n.translate('xpack.slo.compositeSloList.expandRowFor', {
                    defaultMessage: 'Expand row: {name}',
                    values: { name: item.name },
                  })
            }
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },
    {
      field: 'summary.status',
      name: i18n.translate('xpack.slo.compositeSloList.columns.status', {
        defaultMessage: 'Status',
      }),
      width: '100px',
      render: (_: unknown, item: CompositeSLOItem) => {
        const details = detailsById.get(item.id);
        if (!details) {
          return <EuiSkeletonText lines={1} />;
        }
        const { status } = details.summary;
        const statusInfo = displayStatus[status as keyof typeof displayStatus];
        return statusInfo ? (
          <EuiBadge color={statusInfo.badgeColor}>{statusInfo.displayText}</EuiBadge>
        ) : null;
      },
    },
    {
      field: 'name',
      name: i18n.translate('xpack.slo.compositeSloList.columns.name', {
        defaultMessage: 'Name',
      }),
      width: '200px',
      truncateText: true,
      sortable: true,
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.slo.compositeSloList.columns.tags', {
        defaultMessage: 'Tags',
      }),
      width: '130px',
      render: (tags: string[]) => (
        <EuiFlexGroup gutterSize="xs" responsive={false} css={{ overflow: 'hidden' }}>
          {tags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.slo.compositeSloList.columns.memberHealth', {
        defaultMessage: 'Healthy members',
      }),
      width: '130px',
      render: (item: CompositeSLOItem) => {
        const details = detailsById.get(item.id);
        if (!details) return <EuiSkeletonText lines={1} />;
        if (details.summary.status === 'NO_DATA') return NOT_AVAILABLE_LABEL;

        const memberCount = details.members.length;
        const healthyCount = details.members.filter((m) => m.status === 'HEALTHY').length;
        const allHealthy = healthyCount === memberCount;
        const isOpen = openMemberHealthPopoverId === item.id;

        const kqlQuery = `slo.id: (${item.members.map((m) => `"${m.sloId}"`).join(' OR ')})`;
        const href = sloListLocator?.getRedirectUrl({ kqlQuery });

        const label = i18n.translate('xpack.slo.compositeSloList.columns.memberHealthValue', {
          defaultMessage: '{healthy} of {total}',
          values: { healthy: healthyCount, total: memberCount },
        });

        return (
          <EuiPopover
            aria-label={i18n.translate('xpack.slo.compositeSloList.memberHealth.popoverAriaLabel', {
              defaultMessage: 'Member SLO health details',
            })}
            button={
              <EuiLink
                data-test-subj={`compositeSloMemberHealthToggle-${item.id}`}
                color={allHealthy ? 'success' : 'danger'}
                onClick={() => setOpenMemberHealthPopoverId(isOpen ? null : item.id)}
              >
                {label}
              </EuiLink>
            }
            isOpen={isOpen}
            closePopover={() => setOpenMemberHealthPopoverId(null)}
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <EuiFlexGroup direction="column" gutterSize="xs" css={{ minWidth: 240 }}>
              {details.members.map((m) => {
                const statusInfo = displayStatus[m.status as keyof typeof displayStatus];
                return (
                  <EuiFlexItem key={m.id}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        {statusInfo ? (
                          <EuiBadge color={statusInfo.badgeColor}>
                            {statusInfo.displayText}
                          </EuiBadge>
                        ) : null}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText
                          size="s"
                          css={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 180,
                          }}
                        >
                          {m.name}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
              <EuiFlexItem>
                <EuiHorizontalRule margin="xs" />
                <EuiLink data-test-subj="compositeSloMemberHealthViewMembers" href={href}>
                  {i18n.translate('xpack.slo.compositeSloList.memberHealth.viewMembers', {
                    defaultMessage: 'View members',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
        );
      },
    },
    {
      field: 'objective',
      name: i18n.translate('xpack.slo.compositeSloList.columns.objective', {
        defaultMessage: 'Objective',
      }),
      width: '90px',
      render: (objective: CompositeSLOItem['objective']) =>
        numeral(objective.target).format('0[.][000]%'),
    },
    {
      field: 'summary.sliValue',
      name: i18n.translate('xpack.slo.compositeSloList.columns.sliValue', {
        defaultMessage: 'SLI value',
      }),
      width: '90px',
      render: (_: unknown, item: CompositeSLOItem) => {
        const details = detailsById.get(item.id);
        if (!details) {
          return <EuiSkeletonText lines={1} />;
        }
        return details.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(details.summary.sliValue).format(percentFormat);
      },
    },
    {
      name: i18n.translate('xpack.slo.compositeSloList.columns.historicalSli', {
        defaultMessage: 'Historical SLI',
      }),
      width: '80px',
      render: (item: CompositeSLOItem) => {
        const historicalData = historicalSummaryById.get(item.id);
        const details = detailsById.get(item.id);
        const isFailed =
          details?.summary.status === 'VIOLATED' || details?.summary.status === 'DEGRADING';
        return (
          <SloSparkline
            chart="line"
            id={`composite-historical-sli-${item.id}`}
            state={isFailed ? 'error' : 'success'}
            data={formatHistoricalData(historicalData, 'sli_value')}
            isLoading={isHistoricalLoading}
          />
        );
      },
    },
    {
      field: 'summary.errorBudget.remaining',
      name: i18n.translate('xpack.slo.compositeSloList.columns.budgetRemaining', {
        defaultMessage: 'Budget remaining',
      }),
      width: '130px',
      render: (_: unknown, item: CompositeSLOItem) => {
        const details = detailsById.get(item.id);
        if (!details) {
          return <EuiSkeletonText lines={1} />;
        }
        return details.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(details.summary.errorBudget.remaining).format(percentFormat);
      },
    },
    {
      name: i18n.translate('xpack.slo.compositeSloList.columns.activeAlerts', {
        defaultMessage: 'Active alerts',
      }),
      width: '100px',
      render: (item: CompositeSLOItem) => {
        const alertCount = item.members.reduce((sum, m) => {
          return (
            sum + (activeAlerts.get({ id: m.sloId, instanceId: m.instanceId ?? ALL_VALUE }) ?? 0)
          );
        }, 0);

        if (alertCount === 0) return null;

        const kuery = `slo.id: (${item.members.map((m) => `"${m.sloId}"`).join(' OR ')})`;
        const encodedKuery = encode({
          kuery,
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        });

        return (
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.slo.compositeSloList.activeAlerts.tooltip', {
              defaultMessage:
                '{count, plural, one {# burn rate alert} other {# burn rate alerts}} across member SLOs. Opens in a new browser tab.',
              values: { count: alertCount },
            })}
            display="block"
          >
            <EuiBadge
              iconType="warning"
              color="danger"
              onClick={(e) => {
                e.stopPropagation();
                void navigateToApp(observabilityAppId, {
                  path: `/alerts?_a=${encodedKuery}`,
                  openInNewTab: true,
                });
              }}
              onClickAriaLabel={i18n.translate(
                'xpack.slo.compositeSloList.activeAlerts.ariaLabel',
                { defaultMessage: 'View active alerts in a new browser tab' }
              )}
              css={{ cursor: 'pointer' }}
            >
              {alertCount}
            </EuiBadge>
          </EuiToolTip>
        );
      },
    },
    {
      name: (
        <SloBurnRateWindowColumnHeader
          burnRateWindow={burnRateWindow}
          onBurnRateWindowChange={setBurnRateWindow}
          isPopoverOpen={isBurnRatePopoverOpen}
          setIsPopoverOpen={setIsBurnRatePopoverOpen}
          buttonTestSubj="compositeSloListBurnRateWindowSelector"
          popoverAriaLabel={i18n.translate(
            'xpack.slo.compositeSloList.burnRate.windowSelectorAriaLabel',
            { defaultMessage: 'Select burn rate window' }
          )}
          burnRateLabel={i18n.translate('xpack.slo.compositeSloList.columns.burnRate', {
            defaultMessage: 'Burn rate',
          })}
        />
      ),
      width: '160px',
      render: (item: CompositeSLOItem) => {
        const details = detailsById.get(item.id);
        if (!details) {
          return <EuiSkeletonText lines={1} />;
        }
        if (details.summary.status === 'NO_DATA') {
          return NOT_AVAILABLE_LABEL;
        }
        const { fiveMinuteBurnRate, oneHourBurnRate, oneDayBurnRate } = details.summary;
        const windowValue = {
          '5m': fiveMinuteBurnRate,
          '1h': oneHourBurnRate,
          '1d': oneDayBurnRate,
        }[burnRateWindow];
        return <EuiText size="s">{`${numeral(windowValue).format('0.[00]')}x`}</EuiText>;
      },
    },
    {
      field: 'timeWindow',
      name: i18n.translate('xpack.slo.compositeSloList.columns.timeWindow', {
        defaultMessage: 'Time window',
      }),
      width: '120px',
      render: (timeWindow: Record<string, unknown>) => {
        const duration = String(timeWindow.duration);
        return `${duration} (${timeWindow.type})`;
      },
    },
    {
      name: i18n.translate('xpack.slo.compositeSloList.columns.actions', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.slo.compositeSloList.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate('xpack.slo.compositeSloList.actions.editDescription', {
            defaultMessage: 'Edit this composite SLO',
          }),
          icon: 'pencil',
          type: 'icon',
          enabled: () => hasWritePermissions,
          onClick: (item: CompositeSLOItem) => {
            navigateToUrl(basePath.prepend(paths.sloCompositeEdit(item.id)));
          },
          'data-test-subj': 'compositeSloEditAction',
        },
        {
          name: i18n.translate('xpack.slo.compositeSloList.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.slo.compositeSloList.actions.deleteDescription', {
            defaultMessage: 'Delete this composite SLO',
          }),
          icon: 'trash',
          type: 'icon',
          color: 'danger',
          enabled: () => hasWritePermissions,
          onClick: (item: CompositeSLOItem) => {
            onDelete(item);
          },
          'data-test-subj': 'compositeSloDeleteAction',
        },
      ],
    },
  ];

  return (
    <EuiBasicTable
      css={{ overflowX: 'auto' }}
      data-test-subj="compositeSloList"
      tableCaption={i18n.translate('xpack.slo.compositeSloList.tableCaption', {
        defaultMessage: 'Composite SLOs',
      })}
      items={results}
      columns={columns}
      itemId="id"
      itemIdToExpandedRowMap={expandedRows}
      rowHeader="name"
      loading={isDetailsLoading}
      sorting={{
        sort: {
          field: sort.field as keyof CompositeSLOItem,
          direction: sort.direction,
        },
      }}
      pagination={{
        ...pagination,
        pageSizeOptions: [10, 25, 50],
      }}
      onChange={({ page: nextPage, sort: nextSort }: CriteriaWithPagination<CompositeSLOItem>) => {
        if (nextPage) {
          onPageChange(nextPage.index, nextPage.size);
        }
        if (nextSort) {
          const mappedField = SORTABLE_FIELDS[nextSort.field as string];
          if (mappedField) {
            onSortChange(mappedField, nextSort.direction);
          }
        }
      }}
      noItemsMessage={i18n.translate('xpack.slo.compositeSloList.noItems', {
        defaultMessage: 'No composite SLOs found',
      })}
    />
  );
}
