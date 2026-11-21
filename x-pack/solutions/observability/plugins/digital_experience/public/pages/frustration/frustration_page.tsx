/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageSection, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type { ApplicationSource } from '../../../common/types/applications';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { ApplicationTabToolbar } from '../../components/application_tab_toolbar';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useLastEnvironments } from '../../hooks/use_last_environments';
import { useApplicationErrors } from '../errors/hooks/use_application_errors';

const FRUSTRATION_LABEL = i18n.translate('xpack.digitalExperience.frustration.label', {
  defaultMessage: 'Frustration',
});

const TITLE = i18n.translate('xpack.digitalExperience.frustration.title', {
  defaultMessage: 'Frustration signals',
});

const DESCRIPTION = i18n.translate('xpack.digitalExperience.frustration.description', {
  defaultMessage: 'Rage, dead and error clicks reported by EDOT Browser.',
});

const classicUnavailablePrompt = (
  <EuiPageSection paddingSize="m" restrictWidth={false}>
    <EuiEmptyPrompt
      data-test-subj="digitalExperienceFrustrationClassicUnavailable"
      iconType="cursorHand"
      title={
        <h2>
          {i18n.translate('xpack.digitalExperience.frustration.classicUnavailableTitle', {
            defaultMessage: 'The frustration dashboard needs EDOT Browser',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.digitalExperience.frustration.classicUnavailableDescription', {
            defaultMessage:
              'Frustration signals are reported by EDOT Browser with frustration detection. Instrument this application with it to see them.',
          })}
        </p>
      }
    />
  </EuiPageSection>
);

/** The time range and environment of the page; the application's environments come with its errors. */
function FrustrationControls({ serviceName }: { serviceName: string }) {
  const { response, isLoading, refresh } = useApplicationErrors(serviceName);
  const environments = useLastEnvironments(serviceName, response);

  return (
    <ApplicationTabToolbar environments={environments} isLoading={isLoading} onRefresh={refresh} />
  );
}

/** The frustration dashboard of an EDOT Browser application, opened from its Overview. */
export function FrustrationPage({
  serviceName,
  source,
}: {
  serviceName: string;
  source: ApplicationSource;
}) {
  const { overviewHref } = useApplicationLinks(serviceName, source);

  useRouteBreadcrumb([{ text: serviceName, href: overviewHref }, { text: FRUSTRATION_LABEL }]);

  return (
    <>
      <AppHeader
        title={TITLE}
        description={DESCRIPTION}
        back={{ href: overviewHref, label: serviceName }}
      />
      {source === APPLICATION_SOURCE.otel ? (
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          <FrustrationControls serviceName={serviceName} />
          <EuiSpacer size="m" />
          <div data-test-subj="digitalExperienceFrustrationDashboardSlot" />
        </EuiPageSection>
      ) : (
        classicUnavailablePrompt
      )}
    </>
  );
}
