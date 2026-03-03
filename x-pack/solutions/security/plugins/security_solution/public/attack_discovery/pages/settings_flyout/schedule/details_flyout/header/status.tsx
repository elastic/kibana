/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { StatusBadge } from '../../common/status_badge';

interface Props {
  schedule?: AttackDiscoverySchedule;
}

export const Status: React.FC<Props> = React.memo(({ schedule }) => {
  if (!schedule?.lastExecution) {
    return null;
  }

  const executionDate = schedule.lastExecution.date;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" data-test-subj="executionStatus">
      <EuiFlexItem grow={false}>
        <StatusBadge schedule={schedule} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <>{i18n.STATUS_AT}</>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedDate value={executionDate} fieldName={i18n.STATUS_DATE} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
Status.displayName = 'Status';
