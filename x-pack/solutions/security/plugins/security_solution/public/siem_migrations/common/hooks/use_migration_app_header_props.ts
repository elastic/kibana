/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AppHeaderProps } from '@kbn/app-header';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { OnboardingCardId, OnboardingTopicId } from '../../../onboarding/constants';
import { useNavigation } from '../../../common/lib/kibana';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import * as i18n from '../components/header_buttons/translations';

export interface MigrationAppHeaderParams {
  /** The type of migrations (e.g. rule, dashboards) */
  migrationType: MigrationType;
  /** Available migrations stats */
  migrationsStats: MigrationTaskStats[];
}

export type MigrationAppHeaderProps = Pick<AppHeaderProps, 'menu'>;

/**
 * Builds the `AppHeader` props for a SIEM migrations page. The header only hosts
 * the "Add another migration" action in its side menu; the migration selector
 * combo box and stats badges are rendered in a toolbar row below the header —
 * see `MigrationSelector` and `MigrationStatsBadges`.
 */
export const useMigrationAppHeaderProps = ({
  migrationType,
  migrationsStats,
}: MigrationAppHeaderParams): MigrationAppHeaderProps => {
  const { navigateTo, getAppUrl } = useNavigation();

  const menu = useMemo<AppHeaderProps['menu']>(() => {
    if (!migrationsStats.length) {
      return undefined;
    }

    const onboardingCardId =
      migrationType === 'rule'
        ? OnboardingCardId.siemMigrationsRules
        : OnboardingCardId.siemMigrationsDashboards;
    const onboardingPath = `${OnboardingTopicId.siemMigrations}#${onboardingCardId}`;

    return {
      items: [
        {
          id: 'addAnotherMigration',
          testId: 'addAnotherMigrationButton',
          label: i18n.SIEM_MIGRATIONS_ADD_ANOTHER_MIGRATION_TITLE,
          iconType: 'plusCircle',
          order: 0,
          href: getAppUrl({ deepLinkId: SecurityPageName.landing, path: onboardingPath }),
          run: () => navigateTo({ deepLinkId: SecurityPageName.landing, path: onboardingPath }),
        },
      ],
    };
  }, [migrationsStats.length, migrationType, getAppUrl, navigateTo]);

  return { menu };
};
