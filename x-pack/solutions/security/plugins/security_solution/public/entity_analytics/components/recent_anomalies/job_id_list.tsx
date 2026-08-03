/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES, useMlManagementHref } from '@kbn/ml-plugin/public';
import { useKibana } from '../../../common/lib/kibana';
import { getAnomalyChartStyling } from './anomaly_chart_styling';

interface JobIdListProps {
  jobIds: string[];
  compressed?: boolean;
}

const JobIdLink: React.FC<{ jobId: string }> = ({ jobId }) => {
  const {
    services: { ml },
  } = useKibana();

  const jobUrl = useMlManagementHref(ml, {
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    pageState: {
      jobId: [jobId],
    },
  });

  if (!jobUrl) {
    return <>{jobId}</>;
  }

  return (
    <EuiLink
      href={jobUrl}
      target="_blank"
      data-test-subj="recentAnomaliesJobIdLink"
      aria-label={i18n.translate(
        'xpack.securitySolution.entityAnalytics.recentAnomalies.jobIdLinkAriaLabel',
        {
          defaultMessage: 'Open anomaly detection job {jobId}',
          values: { jobId },
        }
      )}
    >
      {jobId}
    </EuiLink>
  );
};

export const JobIdList: React.FC<JobIdListProps> = ({ jobIds, compressed = false }) => {
  const styling = getAnomalyChartStyling(compressed);

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${styling.heightOfTopLegend}px;
        height: ${styling.heightOfEntityNamesList(jobIds.length)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {jobIds.map((jobId) => (
          <EuiFlexItem
            key={jobId}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'} size={'s'}>
              <JobIdLink jobId={jobId} />
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
