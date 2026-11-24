/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import type { MigrationType } from '../../../../common/siem_migrations/types';
import { OnboardingCardId } from '../../../onboarding/constants';
import { useKibana, useNavigation } from '../../../common/lib/kibana';
import { useMigrationAppHeaderProps } from './use_migration_app_header_props';

jest.mock('../../../common/lib/kibana');

const navigateTo = jest.fn();
const getAppUrl = jest.fn((params: { path?: string }) => `/app/security/manage${params.path}`);

const migrationsStats = [{ id: 'migration-1' }] as MigrationTaskStats[];

const renderHeaderProps = (migrationType?: MigrationType, stats = migrationsStats) =>
  renderHook(() => useMigrationAppHeaderProps({ migrationType, migrationsStats: stats })).result
    .current;

describe('useMigrationAppHeaderProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigateTo, getAppUrl });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: { links: { securitySolution: { siemMigrations: 'https://docs.test' } } },
        http: { basePath: { prepend: (path: string) => path } },
      },
    });
  });

  it.each([
    ['rule', OnboardingCardId.siemMigrationsRules],
    ['dashboard', OnboardingCardId.siemMigrationsDashboards],
    ['workflow', OnboardingCardId.siemMigrationsWorkflows],
  ] as const)(
    'should send "Add another migration" for %s migrations to the matching onboarding card',
    (migrationType, cardId) => {
      const { menu } = renderHeaderProps(migrationType);

      menu?.primaryActionItem?.run?.({} as never);

      expect(navigateTo).toHaveBeenCalledWith({
        deepLinkId: SecurityPageName.siemMigrationsManage,
        path: `#${cardId}`,
      });
    }
  );

  it('should link "Add another migration" to the workflows onboarding card for workflow migrations', () => {
    const { menu } = renderHeaderProps('workflow');

    expect(menu?.primaryActionItem?.href).toBe(
      `/app/security/manage#${OnboardingCardId.siemMigrationsWorkflows}`
    );
  });

  it('should not offer "Add another migration" when there are no migrations', () => {
    const { menu } = renderHeaderProps('workflow', []);

    expect(menu?.primaryActionItem).toBeUndefined();
  });
});
