/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiPageBody } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { PageTitle } from './common/components/page_title';
import { useSpaceId } from '../common/hooks/use_space_id';
import { CenteredLoadingSpinner } from '../common/components/centered_loading_spinner';
import { OnboardingContextProvider } from '../onboarding/components/onboarding_context';
import { HeaderPage } from '../common/components/header_page';
import { SiemMigrationsBody } from './components/body';

const SIEM_MIGRATIONS_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.create.pageTitle',
  {
    defaultMessage: 'Automatic Migrations',
  }
);

export const SiemMigrationsCreatePage = () => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return <CenteredLoadingSpinner size="l" topOffset="10em" />;
  }

  return (
    <OnboardingContextProvider spaceId={spaceId}>
      <SecuritySolutionPageWrapper>
        <HeaderPage title={<PageTitle title={SIEM_MIGRATIONS_PAGE_TITLE} />} border />
        <EuiSpacer size="xl" />
        <EuiPageBody restrictWidth>
          <SiemMigrationsBody />
        </EuiPageBody>
      </SecuritySolutionPageWrapper>
    </OnboardingContextProvider>
  );
};
