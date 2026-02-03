/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KUBERNETES_PATH, SecurityPageName } from '../../common/constants';
import { KUBERNETES } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import kubernetesPageImg from '../common/images/kubernetes_page.png';

export const links: LinkItem = {
  id: SecurityPageName.kubernetes,
  title: KUBERNETES,
  landingImage: kubernetesPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.kubernetesDescription', {
    defaultMessage:
      'Provides interactive visualizations of your Kubernetes workload and session data.',
  }),
  path: KUBERNETES_PATH,
  experimentalKey: 'kubernetesEnabled',
  globalSearchKeywords: ['Kubernetes'],
};
