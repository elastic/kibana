/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useGetUrlParams, useUrlParams } from '../../hooks';

const toArray = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
};

const serializeArray = (values: string[]): string =>
  values.length > 0 ? JSON.stringify(values) : '';

export interface CertFiltersState {
  search: string;
  monitorTypes: string[];
  browserResourceTypes: string[];
  certOrigin: string[];
  tags: string[];
  issuers: string[];
  remoteNames: string[];
  expiringWithin?: string;
}

export interface CertFiltersActions {
  setSearch: (value: string) => void;
  setMonitorTypes: (values: string[]) => void;
  setBrowserResourceTypes: (values: string[]) => void;
  setCertOrigin: (values: string[]) => void;
  setTags: (values: string[]) => void;
  setIssuers: (values: string[]) => void;
  setRemoteNames: (values: string[]) => void;
  setExpiringWithin: (value?: string) => void;
}

/**
 * Persists the Certificates page quick filters in the URL so a filtered view
 * survives a refresh and is shareable.
 */
export const useCertFilters = (): CertFiltersState & CertFiltersActions => {
  const {
    search,
    monitorTypes,
    tags,
    issuers,
    browserResourceTypes,
    certOrigin,
    expiringWithin,
    remoteNames,
  } = useGetUrlParams();
  const [, updateUrlParams] = useUrlParams();

  const setSearch = useCallback(
    (value: string) => updateUrlParams({ search: value || '' }),
    [updateUrlParams]
  );
  const setMonitorTypes = useCallback(
    (values: string[]) => updateUrlParams({ monitorTypes: serializeArray(values) }),
    [updateUrlParams]
  );
  const setBrowserResourceTypes = useCallback(
    (values: string[]) => updateUrlParams({ browserResourceTypes: serializeArray(values) }),
    [updateUrlParams]
  );
  const setCertOrigin = useCallback(
    (values: string[]) => updateUrlParams({ certOrigin: serializeArray(values) }),
    [updateUrlParams]
  );
  const setTags = useCallback(
    (values: string[]) => updateUrlParams({ tags: serializeArray(values) }),
    [updateUrlParams]
  );
  const setIssuers = useCallback(
    (values: string[]) => updateUrlParams({ issuers: serializeArray(values) }),
    [updateUrlParams]
  );
  const setRemoteNames = useCallback(
    (values: string[]) => updateUrlParams({ remoteNames: serializeArray(values) }),
    [updateUrlParams]
  );
  const setExpiringWithin = useCallback(
    (value?: string) => updateUrlParams({ expiringWithin: value || '' }),
    [updateUrlParams]
  );

  return useMemo(
    () => ({
      search: search || '',
      monitorTypes: toArray(monitorTypes),
      browserResourceTypes: toArray(browserResourceTypes),
      certOrigin: toArray(certOrigin),
      tags: toArray(tags),
      issuers: toArray(issuers),
      remoteNames: toArray(remoteNames),
      expiringWithin,
      setSearch,
      setMonitorTypes,
      setBrowserResourceTypes,
      setCertOrigin,
      setTags,
      setIssuers,
      setRemoteNames,
      setExpiringWithin,
    }),
    [
      search,
      monitorTypes,
      browserResourceTypes,
      certOrigin,
      tags,
      issuers,
      remoteNames,
      expiringWithin,
      setSearch,
      setMonitorTypes,
      setBrowserResourceTypes,
      setCertOrigin,
      setTags,
      setIssuers,
      setRemoteNames,
      setExpiringWithin,
    ]
  );
};
