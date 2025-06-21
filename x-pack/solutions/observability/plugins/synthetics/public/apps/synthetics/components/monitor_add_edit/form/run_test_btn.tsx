/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { TestNowModeFlyout, TestRun } from '../../test_now_mode/test_now_mode_flyout';
import { format } from './formatter';
import { MonitorFields as MonitorFieldsType } from '../../../../../../common/runtime_types';
import { runOnceMonitor } from '../../../state/manual_test_runs/api';
import { useGetUrlParams } from '../../../hooks';

export const RunTestButton = ({
  canUsePublicLocations = true,
  isServiceAllowed,
}: {
  canUsePublicLocations?: boolean;
  isServiceAllowed?: boolean;
}) => {
  const { handleSubmit } = useFormContext();
  const [inProgress, setInProgress] = useState(false);
  const [testRun, setTestRun] = useState<TestRun>();
  const { space } = useKibanaSpace();
  const { spaceId } = useGetUrlParams();

  const handleTestNow = (formData: any) => {
    const config = formData as MonitorFieldsType;
    setInProgress(true);
    setTestRun({
      id: uuidv4(),
      name: config.name,
      monitor: format(config) as MonitorFieldsType,
    });
  };

  const {
    data,
    loading: isPushing,
    error: serviceError,
  } = useFetcher(() => {
    if (testRun?.id) {
      return runOnceMonitor({
        monitor: testRun.monitor,
        id: testRun.id,
        ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
      });
    }
  }, [space?.id, spaceId, testRun?.id, testRun?.monitor]);

  const tooltipContent = inProgress ? TEST_SCHEDULED_LABEL : TEST_NOW_DESCRIPTION;

  return (
    <>
      <EuiToolTip key={tooltipContent} content={tooltipContent}>
        <EuiButton
          data-test-subj="syntheticsRunTestBtn"
          color="success"
          disabled={inProgress || !canUsePublicLocations || !isServiceAllowed}
          aria-label={TEST_NOW_ARIA_LABEL}
          iconType="play"
          onClick={handleSubmit(handleTestNow)}
        >
          {RUN_TEST}
        </EuiButton>
      </EuiToolTip>

      {testRun && (
        <TestNowModeFlyout
          serviceError={serviceError}
          errors={data?.errors ?? []}
          isPushing={Boolean(isPushing)}
          testRun={testRun}
          name={testRun.name}
          inProgress={inProgress}
          onClose={() => {
            setTestRun(undefined);
            setInProgress(false);
          }}
          onDone={() => {
            setInProgress(false);
          }}
        />
      )}
    </>
  );
};

const TEST_NOW_DESCRIPTION = i18n.translate('xpack.synthetics.testRun.description', {
  defaultMessage: 'Test your monitor and verify the results before saving',
});

export const TEST_SCHEDULED_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.scheduled',
  {
    defaultMessage: 'Test is already scheduled',
  }
);

export const TEST_NOW_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.testNow.AriaLabel',
  {
    defaultMessage: 'Click to run test now',
  }
);

const RUN_TEST = i18n.translate('xpack.synthetics.monitorList.runTest.label', {
  defaultMessage: 'Run test',
});
