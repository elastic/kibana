/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as ossVisualRegressionServices } from '../../../test/visual_regression/services';
import { services as functionalServices } from '../functional/services';

export const services = {
  ...functionalServices,
  visualTesting: ossVisualRegressionServices.visualTesting,
};
