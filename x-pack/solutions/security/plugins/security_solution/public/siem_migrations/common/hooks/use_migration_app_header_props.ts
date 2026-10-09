/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AppHeaderProps } from '@kbn/app-header';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { OnboardingCardId, OnboardingTopicId } from '../../../onboarding/constants';
import { useKibana, useNavigation } from '../../../common/lib/kibana';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import * as i18n from './translations';

export interface MigrationAppHeaderParams {
  /** The type of migrations (e.g. rule, dashboards) */
  migrationType?: MigrationType;
  /** Available migrations stats */
  migrationsStats?: MigrationTaskStats[];
}

export type MigrationAppHeaderProps = Pick<AppHeaderProps, 'menu' | 'docLink'>;

/**
 * Builds the `AppHeader` props for a SIEM migrations page. "Add integrations" is the
 * first overflow group; Feedback and Documentation are the header's static group below
 * it. "Add another migration" is the primary action when migrations exist. Call with no
 * args for the overflow menu only, as on Manage Automatic Migrations. The migration
 * selector is rendered below the header — see `MigrationSelectorRow`.
 */
export const useMigrationAppHeaderProps = ({
  migrationType,
  migrationsStats = [],
}: MigrationAppHeaderParams = {}): MigrationAppHeaderProps => {
  const { navigateTo, getAppUrl } = useNavigation();
  const {
    docLinks,
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const documentationLink = docLinks.links.securitySolution.siemMigrations;
  const integrationsUrl = prepend(ADD_DATA_PATH);

  const menu = useMemo<AppHeaderProps['menu']>(() => {
    const items: NonNullable<AppHeaderProps['menu']>['items'] = [
      {
        id: 'addIntegrations',
        testId: 'addIntegrationsButton',
        label: i18n.SIEM_MIGRATIONS_ADD_INTEGRATIONS_TITLE,
        iconType: 'indexOpen',
        order: 1,
        overflow: true,
        href: integrationsUrl,
        run: () => navigateTo({ url: integrationsUrl }),
      },
    ];

    if (!migrationType || migrationsStats.length === 0) {
      return { items };
    }

    const onboardingCardId =
      migrationType === 'rule'
        ? OnboardingCardId.siemMigrationsRules
        : OnboardingCardId.siemMigrationsDashboards;
    const onboardingPath = `${OnboardingTopicId.siemMigrations}#${onboardingCardId}`;

    const onboardingHref = getAppUrl({
      deepLinkId: SecurityPageName.landing,
      path: onboardingPath,
    });

    return {
      primaryActionItem: {
        id: 'addAnotherMigration',
        testId: 'addAnotherMigrationButton',
        label: i18n.SIEM_MIGRATIONS_ADD_ANOTHER_MIGRATION_TITLE,
        iconType: 'plusCircle' as const,
        href: onboardingHref,
        run: () => navigateTo({ deepLinkId: SecurityPageName.landing, path: onboardingPath }),
      },
      items,
    };
  }, [migrationsStats.length, migrationType, getAppUrl, navigateTo, integrationsUrl]);

  return { menu, docLink: documentationLink };
};
