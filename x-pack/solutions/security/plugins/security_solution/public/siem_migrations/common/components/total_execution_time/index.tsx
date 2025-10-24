/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DurationFormat } from '@kbn/field-formats-plugin/common';
import type { MigrationType } from '../../../../../common/siem_migrations/types';
import * as i18n from './translations';

const getDurationFomatter = () => {
  return new DurationFormat({
    inputFormat: 'milliseconds',
    outputFormat: 'humanize',
    showSuffix: true,
    useShortSuffix: true,
    includeSpaceWithSuffix: true,
  });
};

interface TotalExecutionTimeProps {
  migrationType: MigrationType;
  milliseconds: number;
}

export const TotalExecutionTime: React.FC<TotalExecutionTimeProps> = ({
  milliseconds,
  migrationType,
}) => {
  const humanizedDuration = useMemo(() => {
    return getDurationFomatter().convert(milliseconds);
  }, [milliseconds]);

  const toolTipContent = useMemo(
    () => i18n.TOTAL_EXECUTION_TIME_TOOLTIP(migrationType === 'rule' ? 'rules' : 'dashboards'),
    [migrationType]
  );

  return (
    <EuiFlexGroup
      data-test-subj="migrationExecutionTime"
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIconTip
          aria-label={toolTipContent}
          type="info"
          size="m"
          content={toolTipContent}
          color="warning"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{i18n.TOTAL_EXECUTION_TIME(humanizedDuration)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
