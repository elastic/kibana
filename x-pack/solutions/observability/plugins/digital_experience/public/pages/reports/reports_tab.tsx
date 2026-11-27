/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReportTemplateId } from './report_templates';
import { REPORT_TEMPLATES } from './report_templates';

const DESCRIPTION = i18n.translate('xpack.digitalExperience.reports.description', {
  defaultMessage: 'Reports summarize an application over a period, to share and to schedule.',
});

/** The report templates of one EDOT Browser application, each linking to its report. */
export function ReportsTab({ hrefs }: { hrefs: Record<ReportTemplateId, string> }) {
  return (
    <div data-test-subj="digitalExperienceReportsTab">
      <EuiText color="subdued" size="s">
        <p>{DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {REPORT_TEMPLATES.map(({ id, title, description, iconType }) => (
          <EuiFlexItem key={id}>
            <EuiCard
              data-test-subj={`digitalExperienceReportCard-${id}`}
              icon={<EuiIcon type={iconType} size="xl" aria-hidden={true} />}
              title={title}
              description={description}
              href={hrefs[id]}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
}
