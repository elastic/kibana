/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { RouteProps } from '../../routes';
import { SETTINGS_ROUTE, SYNTHETICS_SETTINGS_ROUTE } from '../../../../../common/constants';
import { SettingsPage } from './settings_page';
import { getSettingsPageHeader } from './page_header';

export const getSettingsRouteConfig = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
  baseTitle: string
) => {
  const sharedProps = {
    title: i18n.translate('xpack.synthetics.settingsRoute.title', {
      defaultMessage: 'Settings | {baseTitle}',
      values: { baseTitle },
    }),
    component: SettingsPage,
    pageHeader: getSettingsPageHeader(history, syntheticsPath),
    dataTestSubj: 'syntheticsSettingsPage',
    pageSectionProps: {
      paddingSize: 'm',
    },
  };

  return [
    {
      ...sharedProps,
      path: SETTINGS_ROUTE,
    },
    {
      ...sharedProps,
      path: SYNTHETICS_SETTINGS_ROUTE,
    },
  ] as RouteProps[];
};
