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

export const MlJobCompatibilityCalloutBody = () => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.mlJobCompatibilityCallout.messageBody"
    defaultMessage="{summary} Related documentation: {docs}"
    values={{
      summary: (
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
      ),
      docs: (
        <ul>
          <li>
            <MlJobCompatibilityLink />
          </li>
        </ul>
      ),
    }}
  />
);
