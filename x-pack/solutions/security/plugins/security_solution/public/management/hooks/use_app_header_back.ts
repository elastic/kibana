/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppHeaderBack } from '@kbn/app-header';
import type { PolicyDetailsRouteState } from '../../../common/endpoint/types';
import { APP_UI_ID } from '../../../common/constants';
import { useAppUrl } from '../../common/lib/kibana';
import { useNavigateToAppEventHandler } from '../../common/hooks/endpoint/use_navigate_to_app_event_handler';

export type AppHeaderBackLink = NonNullable<PolicyDetailsRouteState['backLink']>;

/**
 * Converts a route-state back link into an `AppHeader` `back` target that navigates in-app on click.
 */
export const useAppHeaderBack = (
  backLink: AppHeaderBackLink | undefined
): AppHeaderBack | undefined => {
  const { getAppUrl } = useAppUrl();
  const navigateTo: AppHeaderBackLink['navigateTo'] = backLink?.navigateTo ?? [APP_UI_ID];
  const [appId, navigateOptions] = navigateTo;
  const onClick = useNavigateToAppEventHandler(appId, navigateOptions);

  return useMemo(() => {
    if (!backLink) {
      return undefined;
    }

    return {
      href: backLink.href ?? getAppUrl({ appId, path: navigateOptions?.path }),
      label: backLink.label,
      onClick,
    };
  }, [backLink, getAppUrl, appId, navigateOptions?.path, onClick]);
};
