/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { i18nStrings } from '../i18n_strings';

export const createWorkflowsNavigationTree = (templatesEnabled = false): NodeDefinition => ({
  id: SecurityGroupName.workflows,
  title: SecurityLinkGroup[SecurityGroupName.workflows].title,
  icon: 'branch',
  renderAs: 'panelOpener',
  children: [
    {
      title: i18nStrings.workflows.automation.title,
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'workflows',
        },
        ...(templatesEnabled
          ? [
              {
                title: i18nStrings.workflows.templates.title,
                link: 'workflows-library' as AppDeepLinkId,
              },
            ]
          : []),
      ],
    },
  ],
});
