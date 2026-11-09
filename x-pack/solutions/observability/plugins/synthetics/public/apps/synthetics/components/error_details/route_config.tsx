/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useHistory } from 'react-router-dom';
import { ErrorDetailsPage } from './error_details_page';
import { ERROR_DETAILS_ROUTE } from '../../../../../common/constants';
import type { RouteProps } from '../../routes';

export const getErrorDetailsRouteConfig = (
  _history: ReturnType<typeof useHistory>,
  _syntheticsPath: string,
  baseTitle: string
) => {
  return {
    title: i18n.translate('xpack.synthetics.errorDetailsRoute.title', {
      defaultMessage: 'Error details | {baseTitle}',
      values: { baseTitle },
    }),
    path: ERROR_DETAILS_ROUTE,
    component: ErrorDetailsPage,
    dataTestSubj: 'syntheticsMonitorEditPage',
  } as RouteProps;
};
