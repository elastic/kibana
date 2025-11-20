/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateSloContext } from '../../../../embeddable/slo/overview/create_slo_context';

export function SloGroupListEmpty() {
  const { onCreateSLO } = useCreateSloContext();

  return (
    <EuiCallOut
      data-test-subj="sloGroupListEmpty"
      title={i18n.translate('xpack.slo.groupList.emptyTitle', {
        defaultMessage: 'No SLO group results',
      })}
      color="warning"
      iconType="warning"
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          {i18n.translate('xpack.slo.groupList.emptyMessage', {
            defaultMessage: 'There are no results for your criteria.',
          })}
        </EuiFlexItem>
        {onCreateSLO && (
          <EuiFlexItem>
            <EuiButton
              data-test-subj="sloGroupListEmptyCreateSloButton"
              onClick={onCreateSLO}
              fill
              iconType="plusInCircle"
            >
              {i18n.translate('xpack.slo.groupList.createSloButton', {
                defaultMessage: 'Create SLO',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
