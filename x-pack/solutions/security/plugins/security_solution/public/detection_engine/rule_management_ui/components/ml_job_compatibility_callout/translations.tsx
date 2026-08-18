/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MlJobCompatibilityLink } from '../../../../common/components/links_to_docs';

export const ML_JOB_COMPATIBILITY_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageTitle',
  {
    defaultMessage: 'Your ML jobs may be incompatible with your data sources and/or ML rules',
  }
);

export const MlJobCompatibilitySummary = () => (
  <p>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody.summary"
      defaultMessage="Machine learning rules use ML jobs that in
      turn have dependencies on data fields populated by the Beats
      and Elastic Agent integrations that were current when the ML
      job was created. New ML jobs, prefixed with V3, have been released
      to operate on now-current ECS fields. If you're using multiple
      versions of Beats or Elastic Agent, you may need to duplicate
      or create new machine learning rules that specify the new ML
      (V3) jobs and enable them to run alongside your existing rules,
      to ensure continued rule coverage using V1/V2 jobs."
    />
  </p>
);

export const AffectedJobsTitle = ({ count }: { count: number }) => (
  <p>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody.affectedJobsTitle"
      defaultMessage="The following installed ML {jobsCount, plural, one {job is} other {jobs are}} affected:"
      values={{ jobsCount: count }}
    />
  </p>
);

export const MlJobCompatibilityDocs = () => (
  <>
    <p>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.relatedDocumentationLabel"
        defaultMessage="Related documentation:"
      />
    </p>
    <ul>
      <li>
        <MlJobCompatibilityLink />
      </li>
    </ul>
  </>
);

export const VIEW_ALL_AFFECTED_JOBS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.viewAllAffectedJobs',
    {
      defaultMessage: 'View all {count} affected jobs',
      values: { count },
    }
  );

export const AFFECTED_JOBS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.affectedJobsModalTitle',
  {
    defaultMessage: 'Affected machine learning jobs',
  }
);

export const CLOSE_MODAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.closeModal',
  {
    defaultMessage: 'Close',
  }
);
