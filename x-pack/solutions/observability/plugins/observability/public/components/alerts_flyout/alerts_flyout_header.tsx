/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentProps } from 'react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { GetObservabilityAlertsTableProp } from '../alerts_table/types';

export type AlertsFlyoutHeaderProps = Pick<
  ComponentProps<GetObservabilityAlertsTableProp<'renderFlyoutHeader'>>,
  'alert'
>;

export function AlertsFlyoutHeader({ alert }: AlertsFlyoutHeaderProps) {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="m" data-test-subj="alertsFlyoutTitle">
        <h2>{alert[ALERT_RULE_NAME]?.[0] as string}</h2>
      </EuiTitle>
    </>
  );
}
