/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useHistory } from 'react-router-dom';
import { StepDetailPage } from './step_detail_page';
import type { RouteProps } from '../../routes';
import { SYNTHETICS_STEP_DETAIL_ROUTE } from '../../../../../common/constants';

export const getStepDetailsRoute = (
  _history: ReturnType<typeof useHistory>,
  _syntheticsPath: string,
  baseTitle: string
): RouteProps => {
  return {
    title: i18n.translate('xpack.synthetics.stepDetailsRoute.title', {
      defaultMessage: 'Step details | {baseTitle}',
      values: { baseTitle },
    }),
    path: SYNTHETICS_STEP_DETAIL_ROUTE,
    component: StepDetailPage,
    dataTestSubj: 'syntheticsMonitorEditPage',
  };
};
