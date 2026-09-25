/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuItemType } from '@kbn/app-menu';
import { SECURITY_FEATURE_ID } from '../../../../common';
import { useAddIntegrationsUrl } from '../../hooks/use_add_integrations_url';
import { useKibana } from '../../lib/kibana';

const ADD_INTEGRATIONS_LABEL = i18n.translate(
  'xpack.securitySolution.appHeader.addIntegrationsMenuItemLabel',
  { defaultMessage: 'Add integrations' }
);

export const ADD_INTEGRATIONS_MENU_ITEM_TEST_ID = 'securityAppHeaderAddIntegrations';

/**
 * Builds the "Add integrations" app menu item shared by every Security page header.
 *
 * Always marked `overflow: true` so it renders behind the app menu's "..." button alongside
 * Feedback/Documentation, regardless of viewport width -- the same consistent placement across
 * every migrated page. Returns `undefined` when the current user cannot access Fleet, or the
 * space is a Search AI Lake configuration (mirrors the gating `GlobalHeader` uses today).
 */
export const useAddIntegrationsMenuItem = (): AppMenuItemType | undefined => {
  const {
    services: { application },
  } = useKibana();
  const { href } = useAddIntegrationsUrl();

  const hasSearchAILakeConfigurations =
    application.capabilities[SECURITY_FEATURE_ID]?.configurations === true;
  const canAddData = application.capabilities.fleet.read === true && !hasSearchAILakeConfigurations;

  return useMemo<AppMenuItemType | undefined>(() => {
    if (!canAddData) {
      return undefined;
    }

    return {
      id: 'addIntegrations',
      label: ADD_INTEGRATIONS_LABEL,
      iconType: 'indexOpen',
      href,
      overflow: true,
      testId: ADD_INTEGRATIONS_MENU_ITEM_TEST_ID,
    };
  }, [canAddData, href]);
};
