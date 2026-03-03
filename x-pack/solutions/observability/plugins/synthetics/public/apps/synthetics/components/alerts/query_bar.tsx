/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Filter } from '@kbn/es-query';
import { EuiFormRow, EuiSkeletonText } from '@elastic/eui';
import { useSyntheticsDataView } from '../../contexts/synthetics_data_view_context';
import type { ClientPluginsStart } from '../../../../plugin';

export function AlertSearchBar({
  kqlQuery,
  onChange,
  filtersForSuggestions,
}: {
  kqlQuery: string;
  onChange: (val: { kqlQuery?: string; filters?: Filter[] }) => void;
  filtersForSuggestions?: Filter[];
}) {
  const {
    data: { query },
    kql: { QueryStringInput },
  } = useKibana<ClientPluginsStart>().services;

  const dataView = useSyntheticsDataView();

  useEffect(() => {
    const sub = query.state$.subscribe(() => {
      const queryState = query.getState();
      onChange({
        kqlQuery: String(queryState.query),
      });
    });

    return () => sub.unsubscribe();
  }, [onChange, query]);

  if (!dataView) {
    return <EuiSkeletonText lines={1} />;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.synthetics.list.search.title', {
        defaultMessage: 'Filter by',
      })}
      fullWidth
    >
      <QueryStringInput
        appName="synthetics"
        iconType="search"
        placeholder={PLACEHOLDER}
        indexPatterns={[dataView]}
        onChange={(queryN) => {
          onChange({
            kqlQuery: String(queryN.query),
          });
        }}
        onSubmit={(queryN) => {
          if (queryN) {
            onChange({
              kqlQuery: String(queryN.query),
            });
          }
        }}
        query={{ query: String(kqlQuery), language: 'kuery' }}
        autoSubmit={true}
        disableLanguageSwitcher={true}
        filtersForSuggestions={filtersForSuggestions}
      />
    </EuiFormRow>
  );
}

const PLACEHOLDER = i18n.translate('xpack.synthetics.list.search', {
  defaultMessage: 'Filter by KQL query',
});
