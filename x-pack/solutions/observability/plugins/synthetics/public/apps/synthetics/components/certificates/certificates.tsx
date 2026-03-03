/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants/settings_defaults';
import { setCertificatesTotalAction } from '../../state/certificates/certificates';
import { getDynamicSettingsAction } from '../../state/settings';
import { selectDynamicSettings } from '../../state/settings/selectors';
import { CertificateSearch } from './cert_search';
import { useCertSearch } from './use_cert_search';
import type { CertSort } from './certificates_list';
import { CertificateList } from './certificates_list';
import { useBreadcrumbs } from '../../hooks';
import { useFetchCertAlerts } from './use_fetch_cert_alerts';

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

  const dispatch = useDispatch();
  const { settings } = useSelector(selectDynamicSettings);

  useEffect(() => {
    if (!settings) {
      dispatch(getDynamicSettingsAction.get());
    }
  }, [dispatch, settings]);

  const certExpirationThreshold =
    settings?.certExpirationThreshold ?? DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold;
  const certAgeThreshold =
    settings?.certAgeThreshold ?? DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold;

  const certificates = useCertSearch({
    search,
    size: page.size,
    pageIndex: page.index,
    sortBy: sort.field,
    direction: sort.direction,
  });

  const certSha256List = useMemo(
    () => (certificates?.certs ?? []).map((cert) => cert.sha256).filter(Boolean),
    [certificates?.certs]
  );

  const { alertsByCert } = useFetchCertAlerts(certSha256List);

  useEffect(() => {
    dispatch(setCertificatesTotalAction({ total: certificates.total }));
  }, [certificates.total, dispatch]);

  return (
    <>
      <EuiSpacer size="m" />
      <CertificateSearch setSearch={setSearch} />
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
        alertsByCert={alertsByCert}
        certExpirationThreshold={certExpirationThreshold}
        certAgeThreshold={certAgeThreshold}
      />
    </>
  );
};
