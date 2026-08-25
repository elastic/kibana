/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchSloInstances } from '../../../../hooks/use_fetch_slo_instances';
import { useGetQueryParams } from '../../hooks/use_get_query_params';

interface Instance {
  instanceId: string;
  groupings: Record<string, string | number>;
}

export function SloSelectInstanceFlyout({
  slo,
  onClose,
  onSelect,
}: {
  slo: SLOWithSummaryResponse;
  onClose: () => void;
  onSelect: (instanceId: string) => void;
}) {
  const flyoutId = useGeneratedHtmlId();
  const { remoteName } = useGetQueryParams();
  const [search, setSearch] = useState<string>();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const [searchAfter, setSearchAfter] = useState<string | undefined>(undefined);
  const [searchAfterHistory, setSearchAfterHistory] = useState<Array<string | undefined>>([]);

  useEffect(() => {
    setSearchAfter(undefined);
    setSearchAfterHistory([]);
  }, [debouncedSearch]);

  const { isLoading, isError, data } = useFetchSloInstances({
    sloId: slo.id,
    size: 25,
    remoteName,
    search: debouncedSearch,
    searchAfter,
  });

  const handleNextPage = () => {
    if (data?.searchAfter) {
      setSearchAfterHistory((prev) => [...prev, searchAfter]);
      setSearchAfter(data.searchAfter);
    }
  };

  const handlePreviousPage = () => {
    const newHistory = [...searchAfterHistory];
    const previousCursor = newHistory.pop();
    setSearchAfterHistory(newHistory);
    setSearchAfter(previousCursor);
  };

  const items = data?.results || [];
  const firstItemGroupings = items[0]?.groupings ?? {};

  const columns: Array<EuiBasicTableColumn<Instance>> = [
    {
      field: 'instanceId',
      name: 'Instance ID',
      truncateText: true,
    },
    ...Object.keys(firstItemGroupings).map((key) => ({
      field: `groupings.${key}`,
      name: key,
      truncateText: true,
      render: (_: any, item: Instance) => item.groupings[key],
    })),
    {
      name: 'Action',
      actions: [
        {
          name: 'Select',
          description: i18n.translate(
            'xpack.slo.sloSearchInstancesFlyout.selectSLOInstanceActionDescription',
            { defaultMessage: 'Select this instance' }
          ),
          type: 'icon',
          icon: 'check',
          onClick: (item: Instance) => {
            onSelect(item.instanceId);
            onClose();
          },
        },
      ],
    },
  ];

  const searchLabel = i18n.translate('xpack.slo.sloSearchInstancesFlyout.searchSLOInstancesLabel', {
    defaultMessage: 'Search SLO instances',
  });

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={flyoutId} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutId}>{searchLabel}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFieldSearch
              fullWidth
              data-test-subj="sloSearchInstancesFlyoutSearch"
              placeholder={searchLabel}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isClearable
              aria-label={searchLabel}
            />
            <EuiBasicTable
              tableLayout="auto"
              loading={isLoading}
              error={
                isError
                  ? i18n.translate('xpack.slo.sloSearchInstancesFlyout.errorLabel', {
                      defaultMessage: 'Error loading SLO instances',
                    })
                  : undefined
              }
              noItemsMessage={i18n.translate(
                'xpack.slo.sloSearchInstancesFlyout.noSLOInstancesFoundLabel',
                { defaultMessage: 'No SLO instances found' }
              )}
              tableCaption={i18n.translate(
                'xpack.slo.sloSearchInstancesFlyout.sloInstancesTableCaption',
                { defaultMessage: 'SLO instances' }
              )}
              items={items}
              rowHeader="instanceId"
              columns={columns}
            />
          </EuiFlexGroup>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
            <EuiButton
              data-test-subj="sloSearchInstancesFlyoutPreviousPage"
              disabled={searchAfterHistory.length === 0 || isLoading}
              onClick={handlePreviousPage}
            >
              {i18n.translate('xpack.slo.sloSearchInstancesFlyout.previousPageButtonLabel', {
                defaultMessage: 'Previous page',
              })}
            </EuiButton>
            <EuiButton
              data-test-subj="sloSearchInstancesFlyoutNextPage"
              disabled={!data?.searchAfter || isLoading}
              onClick={handleNextPage}
            >
              {i18n.translate('xpack.slo.sloSearchInstancesFlyout.nextPageButtonLabel', {
                defaultMessage: 'Next page',
              })}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
