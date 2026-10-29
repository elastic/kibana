/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMenuItemType } from '@kbn/app-menu';
import { SECURITY_FEATURE_ID_V5 } from '@kbn/security-solution-features/constants';
import { useKibana } from '../../common/hooks/use_kibana';

// Same destination as the "Add integrations" link in the Security Solution global header
const SECURITY_INTEGRATIONS_PATH = '/app/integrations/browse/security';

const ADD_INTEGRATIONS_LABEL = i18n.translate('xpack.csp.appHeader.addIntegrationsMenuItemLabel', {
  defaultMessage: 'Add integrations',
});

export const ADD_INTEGRATIONS_MENU_ITEM_TEST_ID = 'cspAppHeaderAddIntegrations';

/**
 * "Add integrations" app menu item, replacing the link the Security Solution global header
 * renders for pages that are not migrated to `AppHeader`. It always lives in the overflow menu,
 * and is gated the same way as the global header link: the user needs Fleet read access and the
 * space must not be a Search AI Lake configuration.
 *
 * This duplicates `security_solution`'s `useAddIntegrationsMenuItem` on purpose: `security_solution`
 * depends on this plugin, so importing it back would be a circular dependency. Core's
 * `AppHeader` `showAddIntegrations` prop is not a substitute either -- it points at the unfiltered
 * `/app/integrations/browse` and gates on `navLinks.integrations` instead of Fleet access.
 */
export const useAddIntegrationsMenuItem = (): AppMenuItemType | undefined => {
  const { application, http } = useKibana().services;

  const hasSearchAILakeConfigurations =
    application.capabilities[SECURITY_FEATURE_ID_V5]?.configurations === true;
  const canAddData =
    application.capabilities.fleet?.read === true && !hasSearchAILakeConfigurations;

  return useMemo<AppMenuItemType | undefined>(() => {
    if (!canAddData) {
      return undefined;
    }

    return {
      id: 'addIntegrations',
      label: ADD_INTEGRATIONS_LABEL,
      iconType: 'indexOpen',
      href: http.basePath.prepend(SECURITY_INTEGRATIONS_PATH),
      overflow: true,
      testId: ADD_INTEGRATIONS_MENU_ITEM_TEST_ID,
    };
  }, [canAddData, http.basePath]);
};
