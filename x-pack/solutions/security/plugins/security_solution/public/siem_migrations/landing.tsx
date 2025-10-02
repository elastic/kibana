/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { LandingLinksIconsCategories } from '@kbn/security-solution-navigation/landing_links';
import { SecurityPageName } from '../../common';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { Title } from '../common/components/header_page/title';
import { useRootNavLink } from '../common/links/nav_links';
import { useGlobalQueryString } from '../common/utils/global_query_string';
import { trackLandingLinkClick } from '../common/lib/telemetry/trackers';

const SIEM_MIGRATIONS_PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.landing.pageTitle',
  {
    defaultMessage: 'Migrations',
  }
);

export const MigrationsLandingPage = () => {
  const { links = [], categories = [] } =
    useRootNavLink(SecurityPageName.siemMigrationsLanding) ?? {};
  const urlState = useGlobalQueryString();

  return (
    <SecuritySolutionPageWrapper>
      <Title title={SIEM_MIGRATIONS_PAGE_TITLE} />
      <EuiSpacer size="xl" />
      <LandingLinksIconsCategories
        links={links}
        categories={categories}
        onLinkClick={trackLandingLinkClick}
        urlState={urlState}
      />
    </SecuritySolutionPageWrapper>
  );
};
