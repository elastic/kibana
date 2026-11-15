/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiPageBody } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { useSpaceId } from '../common/hooks/use_space_id';
import { OnboardingBody } from '../onboarding/components/onboarding_body/onboarding_body';
import { OnboardingTopicId } from '../onboarding/constants';
import { CenteredLoadingSpinner } from '../common/components/centered_loading_spinner';
import { OnboardingContextProvider } from '../onboarding/components/onboarding_context';
import { useMigrationAppHeaderProps } from './common/hooks/use_migration_app_header_props';

const SIEM_MIGRATIONS_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.manage.pageTitle',
  {
    defaultMessage: 'Manage Automatic Migrations',
  }
);

export const SiemMigrationsManagePage = () => {
  const spaceId = useSpaceId();
  const { menu, docLink } = useMigrationAppHeaderProps();

  if (!spaceId) {
    return <CenteredLoadingSpinner size="l" topOffset="10em" />;
  }

  return (
    <OnboardingContextProvider spaceId={spaceId}>
      <SecuritySolutionPageWrapper>
        <AppHeader
          title={SIEM_MIGRATIONS_PAGE_TITLE}
          menu={menu}
          docLink={docLink}
          spacing="bleed"
        />
        <EuiSpacer size="xl" />
        <EuiPageBody restrictWidth>
          <OnboardingBody topicId={OnboardingTopicId.siemMigrations} />
        </EuiPageBody>
      </SecuritySolutionPageWrapper>
    </OnboardingContextProvider>
  );
};
