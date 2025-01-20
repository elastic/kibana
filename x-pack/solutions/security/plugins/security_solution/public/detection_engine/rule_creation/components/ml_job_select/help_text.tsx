/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';

import { FormattedMessage } from '@kbn/i18n-react';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import { useKibana } from '../../../../common/lib/kibana';
interface HelpTextProps {
  jobs: SecurityJob[];
  selectedJobIds: string[];
}

export const HelpText = memo(function HelpText({
  jobs,
  selectedJobIds,
}: HelpTextProps): JSX.Element {
  const { getUrlForApp } = useKibana().services.application;
  const mlUrl = getUrlForApp('ml');

  const notRunningJobIds = useMemo<string[]>(() => {
    const selectedJobs = jobs.filter(({ id }) => selectedJobIds.includes(id));
    return selectedJobs.reduce((acc, job) => {
      if (!isJobStarted(job.jobState, job.datafeedState)) {
        acc.push(job.id);
      }
      return acc;
    }, [] as string[]);
  }, [jobs, selectedJobIds]);

  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningJobIdHelpText"
        defaultMessage="We've provided a few common jobs to get you started. To add your own custom jobs, assign a group of 'security' to those jobs in the {machineLearning} application to make them appear here."
        values={{
          machineLearning: (
            <EuiLink href={mlUrl} target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.components.mlJobSelect.machineLearningLink"
                defaultMessage="Machine Learning"
              />
            </EuiLink>
          ),
        }}
      />
      {notRunningJobIds.length > 0 && (
        <div className={warningContainerClassName} data-test-subj="ml-warning-not-running-jobs">
          <EuiText size="xs">
            <span>
              {notRunningJobIds.length === 1 ? (
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlEnableJobSingle"
                  defaultMessage="The selected ML job, {jobName}, is not currently running. We will start {jobName} when you enable this rule."
                  values={{
                    jobName: notRunningJobIds[0],
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlEnableJobMulti"
                  defaultMessage="The selected ML jobs, {jobNames}, are not currently running. We will start all of these jobs when you enable this rule."
                  values={{
                    jobNames: notRunningJobIds.reduce(
                      (acc, value, i, array) =>
                        acc + (i < array.length - 1 ? ', ' : ', and ') + value
                    ),
                  }}
                />
              )}
            </span>
          </EuiText>
        </div>
      )}
    </>
  );
});

const warningContainerClassName = css`
  margin-top: 10px;
`;
