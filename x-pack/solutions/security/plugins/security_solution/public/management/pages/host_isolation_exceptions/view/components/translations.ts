/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.placeholder',
  {
    defaultMessage: 'Host isolation exception name',
  }
);

export const NAME_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.label',
  {
    defaultMessage: 'Name your host isolation exceptions',
  }
);

export const NAME_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.name.error',
  {
    defaultMessage: "The name can't be empty",
  }
);

export const DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.description.placeholder',
  {
    defaultMessage: 'Describe your host isolation exception',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.description.label',
  {
    defaultMessage: 'Description',
  }
);

export const IP_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.placeholder',
  {
    defaultMessage: 'Ex 0.0.0.0/24',
  }
);

export const IP_LABEL = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.label',
  {
    defaultMessage: 'Enter IP Address',
  }
);

export const IP_ERROR = i18n.translate(
  'xpack.securitySolution.hostIsolationExceptions.form.ip.error',
  {
    defaultMessage: 'The IP is invalid. Only IPv4 with optional CIDR is supported',
  }
);
