/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const JobStoppedCallout: React.FC<{
  stoppedJobNames: readonly string[];
}> = ({ stoppedJobNames }) => {
  if (stoppedJobNames.length === 0) {
    return null;
  }

  const jobCount = stoppedJobNames.length;
  const jobNames = i18n.formatList('conjunction', [...stoppedJobNames]);

  return (
    <EuiCallOut color="primary" title={getJobStoppedTitle(jobCount)}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.jobStoppedCalloutMessage"
        defaultMessage="{jobCount, plural, one {The {jobNames} ML job has been stopped manually or due to a lack of resources. New log entries will not be processed until the job has been restarted.} other {The following ML jobs have been stopped manually or due to a lack of resources: {jobNames}. New log entries will not be processed until the jobs have been restarted.}}"
        values={{ jobCount, jobNames }}
        tagName="p"
      />
    </EuiCallOut>
  );
};

const getJobStoppedTitle = (jobCount: number) =>
  i18n.translate('xpack.infra.logs.analysis.jobStoppedCalloutTitle', {
    defaultMessage: '{jobCount, plural, one {ML job stopped} other {ML jobs stopped}}',
    values: { jobCount },
  });
