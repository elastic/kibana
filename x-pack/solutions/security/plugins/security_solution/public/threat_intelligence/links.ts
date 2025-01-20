/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecuritySolutionLink } from '@kbn/threat-intelligence-plugin/public';
import type { SecurityPageName } from '../../common/constants';
import { SECURITY_FEATURE_ID } from '../../common/constants';
import type { LinkItem } from '../common/links';

/**
 * Adds the Threat Intelligence entry to Kibana global sidenav as well as the Security sidenav.
 * Most of the properties are coming from the Threat Intelligence plugin directly through {@link getSecuritySolutionLink}.
 * The ones added below are more related to the Security Solution plugin.
 */
export const indicatorsLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('indicators'),
  globalNavPosition: 8,
  capabilities: [`${SECURITY_FEATURE_ID}.threat-intelligence`],
};
