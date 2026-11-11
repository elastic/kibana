/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiSpacer, EuiText, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import type { SecurityJob } from '../types';
import { MOCK_CUSTOMIZATION_FIELDS } from './ml_job_update_customization';
import * as i18n from '../translations';

interface MlJobUpdateReviewProps {
  job: SecurityJob;
  duplicateBeforeUpdate: boolean;
  onDuplicateBeforeUpdateChange: (checked: boolean) => void;
}

export const MlJobUpdateReview = React.memo<MlJobUpdateReviewProps>(
  ({ job, duplicateBeforeUpdate, onDuplicateBeforeUpdateChange }) => {
    const duplicateCheckboxId = useGeneratedHtmlId({ prefix: 'mlJobDuplicateBeforeUpdate' });
    const jobTitle = job.customSettings?.security_app_display_name ?? job.id;

    return (
      <div data-test-subj="ml-job-update-review">
        <EuiText size="s">
          <p>{i18n.REVIEW_ML_JOB_UPDATE_INTRO}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>{jobTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{i18n.CUSTOMIZATIONS_THAT_WILL_BE_OVERWRITTEN}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <ul>
            {MOCK_CUSTOMIZATION_FIELDS.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </EuiText>
        <EuiSpacer size="xl" />
        <EuiCheckbox
          id={duplicateCheckboxId}
          label={i18n.DUPLICATE_JOB_BEFORE_UPDATING}
          checked={duplicateBeforeUpdate}
          onChange={(e) => onDuplicateBeforeUpdateChange(e.target.checked)}
          data-test-subj="ml-job-update-duplicate-checkbox"
        />
      </div>
    );
  }
);

MlJobUpdateReview.displayName = 'MlJobUpdateReview';
