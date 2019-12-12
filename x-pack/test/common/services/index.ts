/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services as kibanaCommonServices } from '../../../../test/common/services';

import { SpacesServiceProvider } from './spaces';

export const services = {
  ...kibanaCommonServices,

  spaces: SpacesServiceProvider,
};
