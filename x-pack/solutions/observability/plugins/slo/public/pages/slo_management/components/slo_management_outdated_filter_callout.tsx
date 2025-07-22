/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useUrlSearchState } from '../hooks/use_url_search_state';

export function SloOutdatedFilterCallout() {
  const { state, onStateChange } = useUrlSearchState();

  if (!state.includeOutdatedOnly) {
    return null;
  }

  return (
    <EuiCallOut color="primary">
      <EuiText>
        <EuiIcon type="info" />{' '}
        {i18n.translate('xpack.slo.outdatedSloFilterCallout.title', {
          defaultMessage:
            "You're currently viewing only outdated SLOs. You can reset them from the action menu to bring them up to date.",
        })}{' '}
        <EuiLink
          data-test-subj="outdated-filter-help-callout"
          onClick={() => {
            onStateChange({
              ...state,
              includeOutdatedOnly: false,
            });
          }}
        >
          {i18n.translate('xpack.slo.outdatedSloFilterCallout.action', {
            defaultMessage: 'Remove filter',
          })}
        </EuiLink>
      </EuiText>
    </EuiCallOut>
  );
}
