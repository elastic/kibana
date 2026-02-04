/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MonitorErrorsCount } from './monitor_errors_count';
import { ErrorsList } from '../../monitor_details/monitor_errors/errors_list';
import { FailedTestsByStep } from './failed_tests_by_step';
import type { PingState } from '../../../../../../common/runtime_types';
import { PanelWithTitle } from '../../common/components/panel_with_title';
import { FailedTestsCount } from './failed_tests_count';
import { MonitorFailedTests } from './failed_tests';
import { useRefreshedRangeFromUrl } from '../../../hooks';

export const ErrorsTabContent = ({
  errorStates,
  loading,
  upStates,
  monitorIds,
}: {
  errorStates: PingState[];
  upStates: PingState[];
  loading: boolean;
  monitorIds: string[];
}) => {
  const time = useRefreshedRangeFromUrl();

  return (
    <>
      <EuiFlexGroup gutterSize="m" wrap={true}>
        <EuiFlexItem grow={1}>
          <PanelWithTitle title={OVERVIEW_LABEL} titleLeftAlign css={{ minWidth: 260 }}>
            <EuiFlexGroup wrap={true} responsive={false}>
              <EuiFlexItem>
                <MonitorErrorsCount from={time.from} to={time.to} monitorIds={monitorIds} />
              </EuiFlexItem>
              <EuiFlexItem>
                <FailedTestsCount from={time.from} to={time.to} monitorIds={monitorIds} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </PanelWithTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <PanelWithTitle title={FAILED_TESTS_LABEL}>
            <MonitorFailedTests time={time} monitorIds={monitorIds} />
          </PanelWithTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" wrap={true}>
        <EuiFlexItem grow={2} css={{ minWidth: 260 }}>
          <PanelWithTitle title={ERRORS_LABEL}>
            <ErrorsList
              errorStates={errorStates}
              upStates={upStates}
              loading={loading}
              showMonitorName={true}
            />
          </PanelWithTitle>
        </EuiFlexItem>
        <FailedTestsByStep time={time} />
      </EuiFlexGroup>
    </>
  );
};

const ERRORS_LABEL = i18n.translate('xpack.synthetics.errors.label', {
  defaultMessage: 'Errors',
});

const OVERVIEW_LABEL = i18n.translate('xpack.synthetics.errors.overview', {
  defaultMessage: 'Overview',
});

const FAILED_TESTS_LABEL = i18n.translate('xpack.synthetics.errors.failedTests', {
  defaultMessage: 'Failed tests',
});
