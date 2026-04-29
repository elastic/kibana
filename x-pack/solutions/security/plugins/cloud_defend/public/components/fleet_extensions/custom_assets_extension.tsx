/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type CustomAssetsAccordionProps, CustomAssetsAccordion } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/hooks/use_kibana';
import { cloudDefendPages } from '../../common/navigation/constants';

const SECURITY_APP_NAME = 'securitySolutionUI';

export const CloudDefendCustomAssetsExtension = () => {
  const { application } = useKibana().services;

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: cloudDefendPages.dashboard.name,
      url: application.getUrlForApp(SECURITY_APP_NAME, { path: cloudDefendPages.dashboard.path }),
      description: i18n.translate(
        'xpack.cloudDefend.createPackagePolicy.customAssetsTab.dashboardViewLabel',
        { defaultMessage: 'View k8s dashboard' }
      ),
    },
  ];

  return <CustomAssetsAccordion views={views} initialIsOpen />;
};
// eslint-disable-next-line import/no-default-export
export { CloudDefendCustomAssetsExtension as default };
