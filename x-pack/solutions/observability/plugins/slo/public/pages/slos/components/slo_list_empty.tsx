/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUrlSearchState } from '../hooks/use_url_search_state';

export function SloListEmpty() {
  const { onStateChange } = useUrlSearchState();

  return (
    <EuiCallOut
      title={i18n.translate('xpack.slo.list.emptyTitle', {
        defaultMessage: 'No results',
      })}
      color="warning"
      iconType="warning"
    >
      {i18n.translate('xpack.slo.list.emptyMessage', {
        defaultMessage: 'There are no results for your criteria.',
      })}

      <EuiButtonEmpty
        data-test-subj="sloSloListEmptyLinkButtonButton"
        onClick={() => {
          onStateChange({
            kqlQuery: '',
            filters: [],
            tagsFilter: undefined,
            statusFilter: undefined,
          });
        }}
        color="primary"
      >
        {i18n.translate('xpack.slo.sloListEmpty.clearFiltersButtonLabel', {
          defaultMessage: 'Clear filters',
        })}
      </EuiButtonEmpty>
    </EuiCallOut>
  );
}
