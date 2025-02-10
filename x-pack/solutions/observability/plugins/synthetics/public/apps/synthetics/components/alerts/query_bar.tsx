/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Filter } from '@kbn/es-query';
import { EuiFormRow, EuiSkeletonText } from '@elastic/eui';
import { useSyntheticsDataView } from '../../contexts/synthetics_data_view_context';
import { ClientPluginsStart } from '../../../../plugin';

export function AlertSearchBar({
  kqlQuery,
  onChange,
}: {
  kqlQuery: string;
  onChange: (val: { kqlQuery?: string; filters?: Filter[] }) => void;
}) {
  const {
    data: { query },
    unifiedSearch: {
      ui: { QueryStringInput },
    },
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
      />
    </EuiFormRow>
  );
}

const PLACEHOLDER = i18n.translate('xpack.synthetics.list.search', {
  defaultMessage: 'Filter by KQL query',
});
