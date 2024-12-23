/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { GroupSummary } from '@kbn/slo-schema';
import React, { memo, useState } from 'react';
import { paths } from '../../../../../common/locators/paths';
import { useFetchSloList } from '../../../../hooks/use_fetch_slo_list';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSloFormattedSLIValue } from '../../hooks/use_slo_summary';
import type { SortDirection, SortField } from '../../hooks/use_url_search_state';
import { SlosView } from '../slos_view';
import { GroupByField } from '../slo_list_group_by';
import { SLOView } from '../toggle_slo_view';
import { useGroupName } from './hooks/use_group_name';

interface Props {
  group: string;
  kqlQuery?: string;
  view: SLOView;
  sort?: SortField;
  direction?: SortDirection;
  groupBy: GroupByField;
  summary?: GroupSummary;
  filters?: Filter[];
}

export function GroupListView({
  group,
  kqlQuery,
  view,
  sort,
  direction,
  groupBy,
  summary,
  filters,
}: Props) {
  const groupQuery = `"${groupBy}": "${group}"`;
  const query = kqlQuery ? `${groupQuery} and ${kqlQuery}` : groupQuery;
  const groupName = useGroupName(groupBy, group, summary);

  const [page, setPage] = useState(0);
  const [accordionState, setAccordionState] = useState<'open' | 'closed'>('closed');
  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setAccordionState(newState);
  };
  const isAccordionOpen = accordionState === 'open';

  const {
    http: { basePath },
  } = useKibana<CoreStart>().services;

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    perPage: itemsPerPage,
    page: page + 1,
    filters,
    disabled: !isAccordionOpen,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const worstSLI = useSloFormattedSLIValue(summary?.worst.sliValue);

  return (
    <>
      <EuiFlexGroup data-test-subj="sloGroupViewPanel">
        <EuiFlexItem>
          <MemoEuiAccordion
            forceState={accordionState}
            onToggle={onToggle}
            buttonContent={
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{groupName}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">({summary?.total})</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            extraAction={
              <EuiFlexGroup responsive={false} alignItems="center">
                {summary!.violated > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">
                      {i18n.translate('xpack.slo.group.totalViolated', {
                        defaultMessage: '{total} Violated',
                        values: {
                          total: summary?.violated,
                        },
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiBadge color={'success'}>
                    {i18n.translate('xpack.slo.group.totalHealthy', {
                      defaultMessage: '{total} Healthy',
                      values: {
                        total: summary?.healthy,
                      },
                    })}
                  </EuiBadge>
                </EuiFlexItem>

                <EuiFlexItem>
                  {group === 'NO_DATA' ? (
                    <span>
                      {i18n.translate('xpack.slo.group.worstPerforming', {
                        defaultMessage: 'Worst performing: ',
                      })}
                      <strong>
                        {i18n.translate('xpack.slo.group.worstPerforming.notAvailable', {
                          defaultMessage: 'N/A',
                        })}
                      </strong>
                    </span>
                  ) : (
                    <EuiToolTip
                      content={
                        <>
                          <EuiText size="s">
                            {i18n.translate('xpack.slo.group.totalSloViolatedTooltip', {
                              defaultMessage: 'SLO: {name}',
                              values: {
                                name: summary?.worst.slo?.name,
                              },
                            })}
                          </EuiText>
                          <EuiText size="s">
                            {i18n.translate('xpack.slo.group.totalSloViolatedTooltip.instance', {
                              defaultMessage: 'Instance: {instance}',
                              values: {
                                instance: summary?.worst.slo?.instanceId,
                              },
                            })}
                          </EuiText>
                        </>
                      }
                    >
                      <EuiLink
                        data-test-subj="o11yGroupListViewLink"
                        href={basePath.prepend(
                          paths.sloDetails(summary!.worst.slo?.id, summary!.worst.slo?.instanceId)
                        )}
                      >
                        {i18n.translate('xpack.slo.group.worstPerforming', {
                          defaultMessage: 'Worst performing: ',
                        })}
                        <EuiTextColor
                          color={summary?.worst.status !== 'HEALTHY' ? 'danger' : undefined}
                        >
                          <strong>{worstSLI}</strong>
                        </EuiTextColor>
                      </EuiLink>
                    </EuiToolTip>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            id={group}
            initialIsOpen={false}
          >
            {isAccordionOpen && (
              <>
                <EuiSpacer size="m" />
                <SlosView
                  sloList={results}
                  loading={isLoading || isRefetching}
                  error={isError}
                  view={view}
                />
                <EuiSpacer size="m" />
                {total > 0 && total > itemsPerPage ? (
                  <EuiTablePagination
                    pageCount={Math.ceil(total / itemsPerPage)}
                    activePage={page}
                    onChangePage={handlePageClick}
                    itemsPerPage={itemsPerPage}
                    onChangeItemsPerPage={(perPage) => {
                      setPage(0);
                      setItemsPerPage(perPage);
                    }}
                  />
                ) : null}
              </>
            )}
          </MemoEuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);
