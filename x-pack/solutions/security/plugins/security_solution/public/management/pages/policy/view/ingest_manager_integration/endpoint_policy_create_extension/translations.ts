/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NGAV = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionNGAV',
  {
    defaultMessage: 'Next-Generation Antivirus (NGAV)',
  }
);

export const NGAV_NOTE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionNGAVNote',
  {
    defaultMessage: 'Note: advanced protections require a platinum license level.',
  }
);

export const EDR_ESSENTIAL = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDREssential',
  {
    defaultMessage: 'Essential EDR (Endpoint Detection & Response)',
  }
);
export const EDR_COMPLETE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDRComplete',
  {
    defaultMessage: 'Complete EDR (Endpoint Detection & Response)',
  }
);

export const EDR_NOTE = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionEDRNote',
  {
    defaultMessage:
      'Note: advanced protections require a platinum license, and full response capabilities require an enterprise license.',
  }
);

export const DATA_COLLECTION = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOptionDataCollection',
  {
    defaultMessage: 'Data Collection',
  }
);

export const DATA_COLLECTION_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointDataCollection',
  {
    defaultMessage:
      'Augment your existing anti-virus solution with advanced data collection and detection',
  }
);

export const ENDPOINT = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.endpointDropdownOption',
  {
    defaultMessage: 'Traditional Endpoints (desktops, laptops, virtual machines)',
  }
);
export const CLOUD_SECURITY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudDropdownOption',
  {
    defaultMessage: 'Cloud Workloads (Linux servers or Kubernetes environments)',
  }
);
export const INTERACTIVE_ONLY = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersInteractiveOnly',
  {
    defaultMessage: 'Interactive only',
  }
);
export const ALL_EVENTS = i18n.translate(
  'xpack.securitySolution.createPackagePolicy.stepConfigure.cloudEventFiltersAllEvents',
  {
    defaultMessage: 'All events',
  }
);
