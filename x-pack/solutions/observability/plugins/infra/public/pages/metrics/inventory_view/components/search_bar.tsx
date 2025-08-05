/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { AutocompleteField } from '../../../../components/autocomplete_field';
import { WithKueryAutocompletion } from '../../../../containers/with_kuery_autocompletion';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';

export const SearchBar = () => {
  const { metricsView } = useMetricsDataViewContext();
  const { applyFilterQuery, filterQuery, isValidKuery } = useWaffleFiltersContext();
  const [kuery, setKuery] = useState('');

  useEffect(() => {
    setKuery(filterQuery.expression);
  }, [filterQuery.expression]);

  const isValid = useMemo(() => isValidKuery(kuery), [isValidKuery, kuery]);

  return (
    <WithKueryAutocompletion dataView={metricsView?.dataViewReference}>
      {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
        <AutocompleteField
          isLoadingSuggestions={isLoadingSuggestions}
          isValid={isValid}
          loadSuggestions={loadSuggestions}
          onChange={setKuery}
          onSubmit={applyFilterQuery}
          placeholder={i18n.translate('xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder', {
            defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
          })}
          suggestions={suggestions}
          value={kuery ?? filterQuery.expression}
          autoFocus
        />
      )}
    </WithKueryAutocompletion>
  );
};
