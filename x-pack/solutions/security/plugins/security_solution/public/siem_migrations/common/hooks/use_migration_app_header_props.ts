/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { AppHeaderProps } from '@kbn/app-header';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { OnboardingCardId } from '../../../onboarding/constants';
import { useAddIntegrationsMenuItem } from '../../../common/components/app_header/use_add_integrations_menu_item';
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
 * first overflow group when the user can open Integrations; Feedback and Documentation
 * are the header's static group below it. "Add another migration" is the primary action
 * when migrations exist. Call with no args for the overflow menu only, as on Manage
 * Automatic Migrations. The migration selector is rendered below the header — see
 * `MigrationSelectorRow`.
 */
export const useMigrationAppHeaderProps = ({
  migrationType,
  migrationsStats = [],
}: MigrationAppHeaderParams = {}): MigrationAppHeaderProps => {
  const { navigateTo, getAppUrl } = useNavigation();
  const { docLinks } = useKibana().services;
  const documentationLink = docLinks.links.securitySolution.siemMigrations;
  const addIntegrationsMenuItem = useAddIntegrationsMenuItem();

  const menu = useMemo<AppHeaderProps['menu']>(() => {
    const items: NonNullable<AppHeaderProps['menu']>['items'] = [];

    if (addIntegrationsMenuItem?.href) {
      const integrationsHref = addIntegrationsMenuItem.href;
      items.push({
        ...addIntegrationsMenuItem,
        href: integrationsHref,
        testId: 'addIntegrationsButton',
        order: 1,
        overflow: true,
        run: () => navigateTo({ url: integrationsHref }),
      });
    }

    if (!migrationType || migrationsStats.length === 0) {
      return { items };
    }

    const onboardingCardId =
      migrationType === 'rule'
        ? OnboardingCardId.siemMigrationsRules
        : OnboardingCardId.siemMigrationsDashboards;
    const manageCardPath = `#${onboardingCardId}`;

    const addAnotherMigrationHref = getAppUrl({
      deepLinkId: SecurityPageName.siemMigrationsManage,
      path: manageCardPath,
    });

    return {
      primaryActionItem: {
        id: 'addAnotherMigration',
        testId: 'addAnotherMigrationButton',
        label: i18n.SIEM_MIGRATIONS_ADD_ANOTHER_MIGRATION_TITLE,
        iconType: 'plusCircle' as const,
        href: addAnotherMigrationHref,
        run: () =>
          navigateTo({
            deepLinkId: SecurityPageName.siemMigrationsManage,
            path: manageCardPath,
          }),
      },
      items,
    };
  }, [addIntegrationsMenuItem, migrationsStats.length, migrationType, getAppUrl, navigateTo]);

  return { menu, docLink: documentationLink };
};
