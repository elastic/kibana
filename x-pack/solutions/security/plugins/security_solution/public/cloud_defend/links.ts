/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSecuritySolutionLink } from '@kbn/cloud-defend-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SecurityPageName } from '../../common/constants';
import { SECURITY_FEATURE_ID } from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { IconCloudDefend } from '../common/icons/cloud_defend';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
};

export const cloudDefendLink: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('policies'),
  description: i18n.translate('xpack.securitySolution.appLinks.cloudDefendPoliciesDescription', {
    defaultMessage:
      'Secure container workloads in Kubernetes from attacks and drift through granular and flexible runtime policies.',
  }),
  landingIcon: IconCloudDefend,
  ...commonLinkProperties,
};
