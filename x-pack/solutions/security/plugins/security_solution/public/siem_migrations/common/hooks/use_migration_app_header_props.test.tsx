/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AppMenuItemType } from '@kbn/app-menu';
import { useKibana, useNavigation } from '../../../common/lib/kibana';
import { useAddIntegrationsMenuItem } from '../../../common/components/app_header/use_add_integrations_menu_item';
import type { MigrationTaskStats } from '../../../../common/siem_migrations/model/common.gen';
import { useMigrationAppHeaderProps } from './use_migration_app_header_props';

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: jest.fn(),
}));

const DOC_LINK = 'https://www.elastic.co/docs/solutions/security/get-started/automatic-migration';
const INTEGRATIONS_HREF = '/app/integrations/browse/security';

const addIntegrationsMenuItem: AppMenuItemType = {
  id: 'addIntegrations',
  label: 'Add integrations',
  iconType: 'tablePlus',
  href: INTEGRATIONS_HREF,
  overflow: true,
  testId: 'securityAppHeaderAddIntegrations',
};

const migrationsStats = [{ id: 'migration-1' }] as MigrationTaskStats[];

const navigateTo = jest.fn();
const getAppUrl = jest.fn(() => '/app/security/get_started#migrate_rules');

describe('useMigrationAppHeaderProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          links: { securitySolution: { siemMigrations: DOC_LINK } },
        },
      },
    });
    (useNavigation as jest.Mock).mockReturnValue({ navigateTo, getAppUrl });
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);
  });

  it('includes Add integrations when the user can open Integrations', () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(addIntegrationsMenuItem);

    const { result } = renderHook(() => useMigrationAppHeaderProps());

    expect(result.current.docLink).toBe(DOC_LINK);
    expect(result.current.menu?.primaryActionItem).toBeUndefined();
    expect(result.current.menu?.items).toEqual([
      expect.objectContaining({
        id: 'addIntegrations',
        testId: 'addIntegrationsButton',
        label: 'Add integrations',
        href: INTEGRATIONS_HREF,
        order: 1,
        overflow: true,
      }),
    ]);

    const [item] = result.current.menu?.items ?? [];
    if (item && 'run' in item) {
      item.run?.();
    }
    expect(navigateTo).toHaveBeenCalledWith({ url: INTEGRATIONS_HREF });
  });

  it('omits Add integrations when Integrations is unavailable and still returns the doc link', () => {
    const { result } = renderHook(() => useMigrationAppHeaderProps());

    expect(result.current.docLink).toBe(DOC_LINK);
    expect(result.current.menu?.items).toEqual([]);
  });

  it('keeps Add another migration as the primary action when migrations exist', () => {
    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(addIntegrationsMenuItem);

    const { result: withIntegrations } = renderHook(() =>
      useMigrationAppHeaderProps({ migrationType: 'rule', migrationsStats })
    );

    expect(withIntegrations.current.menu?.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'addAnotherMigration',
        testId: 'addAnotherMigrationButton',
      })
    );
    expect(withIntegrations.current.menu?.items).toEqual([
      expect.objectContaining({ testId: 'addIntegrationsButton' }),
    ]);

    (useAddIntegrationsMenuItem as jest.Mock).mockReturnValue(undefined);

    const { result: withoutIntegrations } = renderHook(() =>
      useMigrationAppHeaderProps({ migrationType: 'rule', migrationsStats })
    );

    expect(withoutIntegrations.current.menu?.primaryActionItem).toEqual(
      expect.objectContaining({
        id: 'addAnotherMigration',
        testId: 'addAnotherMigrationButton',
      })
    );
    expect(withoutIntegrations.current.menu?.items).toEqual([]);
  });
});
