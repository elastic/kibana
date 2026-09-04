/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  currentCalendarWeek,
  isLiveRelativeRange,
  rumReportTitle,
  type RumReportTemplateId,
} from '../../../../common/rum_report';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { pushRumPath } from '../../../utils/rum_search';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';

const PURPOSE: Record<RumReportTemplateId, string> = {
  scorecard: i18n.translate('xpack.ux.reports.catalog.scorecardDescription', {
    defaultMessage:
      'This week vs last week — KPIs, CWV, countries, frustration, and sample sessions.',
  }),
  pages: i18n.translate('xpack.ux.reports.catalog.pagesDescription', {
    defaultMessage: 'Slowest and most-viewed routes with Core Web Vitals.',
  }),
  errors: i18n.translate('xpack.ux.reports.catalog.errorsDescription', {
    defaultMessage: 'Exception groups that burned the most sessions and users.',
  }),
  frustration: i18n.translate('xpack.ux.reports.catalog.frustrationDescription', {
    defaultMessage: 'Rage, dead, and error clicks with friction-by-step.',
  }),
  funnel: i18n.translate('xpack.ux.reports.catalog.funnelDescription', {
    defaultMessage: 'Named funnel conversion as a weekly artifact.',
  }),
  clients: i18n.translate('xpack.ux.reports.catalog.clientsDescription', {
    defaultMessage: 'Browser, OS, device, and country mix as a sendable table.',
  }),
  users: i18n.translate('xpack.ux.reports.catalog.usersDescription', {
    defaultMessage: 'Identified-user experience for support and tickets.',
  }),
};

const ICONS: Record<RumReportTemplateId, string> = {
  scorecard: 'visArea',
  pages: 'pageSelect',
  errors: 'bug',
  frustration: 'faceSad',
  funnel: 'queue',
  clients: 'chartBarHorizontal',
  users: 'user',
};

const ORDER: RumReportTemplateId[] = [
  'scorecard',
  'pages',
  'errors',
  'frustration',
  'funnel',
  'clients',
  'users',
];

export function RumReportsCatalog() {
  const history = useHistory();
  const {
    urlParams: { rangeFrom, rangeTo },
  } = useLegacyUrlParams();

  const openReport = (templateId: RumReportTemplateId) => {
    const period = isLiveRelativeRange(rangeFrom, rangeTo) ? currentCalendarWeek() : {};
    pushRumPath(history, `/reports/${templateId}`, {
      ...period,
      compare: 'previous',
    });
  };

  return (
    <div data-test-subj="uxReportsCatalog">
      <UxTourAnchor stepId="reports" display="block">
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.ux.reports.catalog.title', { defaultMessage: 'Reporting' })}
          </h2>
        </EuiTitle>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.ux.reports.catalog.subtitleDescription', {
              defaultMessage:
                'Named, time-bounded artifacts you can paste, print, or export. Opening a card uses the current calendar week unless the date picker already has an absolute range.',
            })}
          </p>
        </EuiText>
      </UxTourAnchor>
      <EuiSpacer />
      <EuiFlexGrid columns={2} gutterSize="m">
        {ORDER.map((templateId) => (
          <EuiFlexItem key={templateId}>
            <EuiCard
              data-test-subj={`uxReportCard-${templateId}`}
              icon={<EuiIcon size="xl" type={ICONS[templateId]} aria-hidden={true} />}
              title={rumReportTitle(templateId)}
              description={PURPOSE[templateId]}
              onClick={() => openReport(templateId)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </div>
  );
}
