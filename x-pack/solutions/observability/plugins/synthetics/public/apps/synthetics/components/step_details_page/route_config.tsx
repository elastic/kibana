/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { OutPortal } from 'react-reverse-portal';
import { StepRunDate } from './step_page_nav';
import { StepDetailPageStepNav } from './step_number_nav';
import { StepDetailsStatus } from './step_details_status';
import { MonitorDetailsLocation } from '../monitor_details/monitor_details_location';
import { StepDetailPage } from './step_detail_page';
import { RouteProps } from '../../routes';
import { SYNTHETICS_STEP_DETAIL_ROUTE } from '../../../../../common/constants';
import { MonitorDetailsLinkPortalNode } from '../monitor_add_edit/portals';
import { StepTitle } from './step_title';

export const getStepDetailsRoute = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string,
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
    pageHeader: {
      pageTitle: <StepTitle />,
      rightSideItems: [
        <StepRunDate />,
        <MonitorDetailsLocation isDisabled={true} />,
        <StepDetailsStatus />,
        <StepDetailPageStepNav />,
      ],
      breadcrumbs: [
        {
          text: <OutPortal node={MonitorDetailsLinkPortalNode} />,
        },
      ],
    },
  };
};
