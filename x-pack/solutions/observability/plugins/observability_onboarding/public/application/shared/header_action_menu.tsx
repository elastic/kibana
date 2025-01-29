/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { LOGS_ONBOARDING_FEEDBACK_LINK } from '@kbn/observability-shared-plugin/common';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { type AppMountParameters } from '@kbn/core-application-browser';
import { type ObservabilityOnboardingAppServices } from '../..';

interface Props {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

export function ObservabilityOnboardingHeaderActionMenu({ setHeaderActionMenu, theme$ }: Props) {
  const {
    services: { context },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const location = useLocation();
  const normalizedPathname = location.pathname.replace(/\/$/, '');

  const isRootPage = normalizedPathname === '';

  if (!context.isServerless && !isRootPage) {
    return (
      <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
        <EuiButton
          data-test-subj="observabilityOnboardingPageGiveFeedback"
          href={LOGS_ONBOARDING_FEEDBACK_LINK}
          size="s"
          target="_blank"
          color="warning"
          iconType="editorComment"
        >
          {i18n.translate('xpack.observability_onboarding.header.feedback', {
            defaultMessage: 'Give feedback',
          })}
        </EuiButton>
      </HeaderMenuPortal>
    );
  }

  return null;
}
