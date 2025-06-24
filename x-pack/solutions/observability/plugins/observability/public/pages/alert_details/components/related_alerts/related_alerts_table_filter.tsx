/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiFlexGroup, EuiFormRow, EuiPanel, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFilterProximalParam } from '../../hooks/use_filter_proximal_param';

export function RelatedAlertsTableFilter() {
  const { filterProximal, setProximalFilterParam } = useFilterProximalParam();

  return (
    <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart">
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.observability.alerts.relatedAlerts.filtersLabel', {
              defaultMessage: 'Filters',
            })}
          </strong>
        </EuiText>
        <EuiFormRow fullWidth>
          <EuiCheckbox
            label={i18n.translate(
              'xpack.observability.alerts.relatedAlerts.proximityCheckboxLabel',
              {
                defaultMessage: 'Created around the same time',
              }
            )}
            checked={filterProximal}
            onChange={(event) => {
              setProximalFilterParam(event.target.checked);
            }}
            id={'proximal-alerts-checkbox'}
            data-test-subj="proximal-alerts-checkbox"
          />
        </EuiFormRow>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
