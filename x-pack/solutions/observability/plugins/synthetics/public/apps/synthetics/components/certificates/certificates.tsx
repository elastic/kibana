/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { MonitorTypeEnum } from '../../../../../common/runtime_types';
import { setCertificatesTotalAction } from '../../state/certificates/certificates';
import { useFilters } from '../monitors_page/common/monitor_filters/use_filters';
import { CertificateSearch } from './cert_search';
import { CertQuickFilter } from './cert_quick_filter';
import type { QuickFilterOption } from './cert_quick_filter';
import {
  BROWSER_RESOURCE_TYPE_OPTIONS,
  MONITOR_TYPE_FILTER_OPTIONS,
  PARTY_FILTER_OPTIONS,
} from './cert_filter_options';
import * as labels from './translations';
import { useCertSearch } from './use_cert_search';
import type { CertSort } from './certificates_list';
import { CertificateList } from './certificates_list';
import { useBreadcrumbs } from '../../hooks';

const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.certList.pageSize';
const getPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

export const CertificatesPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'certificates' });
  useTrackPageview({ app: 'synthetics', path: 'certificates', delay: 15000 });

  useBreadcrumbs([{ text: 'Certificates' }]);

  const [page, setPage] = useState({ index: 0, size: getPageSizeValue() });
  const [sort, setSort] = useState<CertSort>({
    field: 'not_after',
    direction: 'asc',
  });
  const [search, setSearch] = useState('');
  const [monitorTypes, setMonitorTypes] = useState<string[]>([]);
  const [browserResourceTypes, setBrowserResourceTypes] = useState<string[]>([]);
  const [party, setParty] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const dispatch = useDispatch();

  const filters = useFilters();
  const tagOptions: QuickFilterOption[] = useMemo(
    () => (filters?.tags ?? []).map(({ label }) => ({ value: label, label })),
    [filters?.tags]
  );

  // Browser-specific filters are only meaningful when browser certs can appear,
  // i.e. when no monitor-type filter is set (all types) or browser is selected.
  const isBrowserIncluded =
    monitorTypes.length === 0 || monitorTypes.includes(MonitorTypeEnum.BROWSER);

  const resetToFirstPage = () => setPage((prevPage) => ({ ...prevPage, index: 0 }));

  const certificates = useCertSearch({
    search,
    size: page.size,
    pageIndex: page.index,
    sortBy: sort.field,
    direction: sort.direction,
    monitorTypes,
    browserResourceTypes: isBrowserIncluded ? browserResourceTypes : undefined,
    party: isBrowserIncluded ? party : undefined,
    tags,
  });

  useEffect(() => {
    dispatch(setCertificatesTotalAction({ total: certificates.total }));
  }, [certificates.total, dispatch]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem>
          <CertificateSearch setSearch={setSearch} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CertQuickFilter
            label={labels.MONITOR_TYPE_FILTER}
            dataTestSubj="certMonitorTypeFilterButton"
            options={MONITOR_TYPE_FILTER_OPTIONS}
            selectedValues={monitorTypes}
            onChange={(types) => {
              setMonitorTypes(types);
              resetToFirstPage();
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CertQuickFilter
            label={labels.RESOURCE_TYPE_FILTER}
            dataTestSubj="certResourceTypeFilterButton"
            options={BROWSER_RESOURCE_TYPE_OPTIONS}
            selectedValues={browserResourceTypes}
            isDisabled={!isBrowserIncluded}
            disabledTooltip={labels.BROWSER_FILTER_DISABLED_TOOLTIP}
            onChange={(types) => {
              setBrowserResourceTypes(types);
              resetToFirstPage();
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CertQuickFilter
            label={labels.PARTY_FILTER}
            dataTestSubj="certPartyFilterButton"
            options={PARTY_FILTER_OPTIONS}
            selectedValues={party}
            isDisabled={!isBrowserIncluded}
            disabledTooltip={labels.BROWSER_FILTER_DISABLED_TOOLTIP}
            onChange={(values) => {
              setParty(values);
              resetToFirstPage();
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CertQuickFilter
            label={labels.TAGS_FILTER}
            dataTestSubj="certTagsFilterButton"
            options={tagOptions}
            selectedValues={tags}
            searchable
            isDisabled={tagOptions.length === 0}
            disabledTooltip={labels.TAGS_FILTER_NO_TAGS}
            onChange={(values) => {
              setTags(values);
              resetToFirstPage();
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <CertificateList
        page={page}
        onChange={(pageVal, sortVal) => {
          setPage(pageVal);
          setSort(sortVal);
          localStorage.setItem(LOCAL_STORAGE_KEY, pageVal.size.toString());
        }}
        sort={sort}
        certificates={certificates}
      />
    </>
  );
};
