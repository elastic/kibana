/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturesProvider } from './features';
import { UICapabilitiesProvider } from './ui_capabilities';
import { services as commonServices } from '../../../common/services';

export const services = {
  ...commonServices,

  uiCapabilities: UICapabilitiesProvider,
  features: FeaturesProvider,
};

export { FeaturesService } from './features';
