/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { useUrlSearchState } from '../hooks/use_url_search_state';

export function SloListEmpty() {
  const { onStateChange } = useUrlSearchState();

  return (
    <KbnWarningCallout
      title={i18n.translate('xpack.slo.list.emptyTitle', {
        defaultMessage: 'No results',
      })}
      text={i18n.translate('xpack.slo.list.emptyMessage', {
        defaultMessage: 'There are no results for your criteria.',
      })}
      actionProps={{
        primary: {
          'data-test-subj': 'sloSloListEmptyLinkButtonButton',
          onClick: () => {
            onStateChange({
              kqlQuery: '',
              filters: [],
              tagsFilter: undefined,
              statusFilter: undefined,
            });
          },
          children: i18n.translate('xpack.slo.sloListEmpty.clearFiltersButtonLabel', {
            defaultMessage: 'Clear filters',
          }),
        },
      }}
    />
  );
}
