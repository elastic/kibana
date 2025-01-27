/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { securitySolutionMock } from '@kbn/security-solution-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { Services } from '..';
import { allowedExperimentalValues as genericAllowedExperimentalValues } from '@kbn/security-solution-plugin/common';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

export const mockServices: Services = {
  ...coreMock.createStart(),
  experimentalFeatures: { ...allowedExperimentalValues, ...genericAllowedExperimentalValues },
  serverless: serverlessMock.createStart(),
  security: securityMock.createStart(),
  securitySolution: securitySolutionMock.createStart(),
  management: managementPluginMock.createStartContract(),
  cloud: cloudMock.createStart(),
};
