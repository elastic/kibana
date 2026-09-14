/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useHistory } from 'react-router-dom';
import type { RouteProps } from '../../routes';
import { TEST_RUN_DETAILS_ROUTE } from '../../../../../common/constants';
import { TestRunDetails } from './test_run_details';

export const getTestRunDetailsRoute = (
  _history: ReturnType<typeof useHistory>,
  _syntheticsPath: string,
  baseTitle: string
): RouteProps => {
  return {
    title: i18n.translate('xpack.synthetics.testRunDetailsRoute.title', {
      defaultMessage: 'Test run details | {baseTitle}',
      values: { baseTitle },
    }),
    path: TEST_RUN_DETAILS_ROUTE,
    component: TestRunDetails,
    dataTestSubj: 'syntheticsMonitorTestRunDetailsPage',
  };
};
