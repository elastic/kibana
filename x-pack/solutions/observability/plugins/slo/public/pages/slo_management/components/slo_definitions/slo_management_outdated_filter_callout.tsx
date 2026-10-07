/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export function SloOutdatedFilterCallout() {
  const { state, onStateChange } = useUrlSearchState();

  if (!state.includeOutdatedOnly) {
    return null;
  }

  return (
    <KbnInfoCallout
      title={i18n.translate('xpack.slo.outdatedSloFilterCallout.title', {
        defaultMessage:
          "You're currently viewing only outdated SLOs. You can reset them from the action menu to bring them up to date.",
      })}
      actionProps={{
        primary: {
          'data-test-subj': 'outdated-filter-help-callout',
          onClick: () => {
            onStateChange({
              ...state,
              includeOutdatedOnly: false,
            });
          },
          children: i18n.translate('xpack.slo.outdatedSloFilterCallout.action', {
            defaultMessage: 'Remove filter',
          }),
        },
      }}
    />
  );
}
