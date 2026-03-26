/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResourceInstaller } from '../resource_installer';
import type { BurnRatesClient } from '../burn_rates_client';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { SummaryClient } from '../summary_client';
import type { SummarySearchClient } from '../summary_search_client/types';
import type { TransformManager } from '../transform_manager';

const createResourceInstallerMock = (): jest.Mocked<ResourceInstaller> => {
  return {
    ensureCommonResourcesInstalled: jest.fn(),
  };
};

const createTransformManagerMock = (): jest.Mocked<TransformManager> => {
  return {
    install: jest.fn(),
    preview: jest.fn(),
    uninstall: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    inspect: jest.fn(),
    getVersion: jest.fn(),
  };
};

const createSummaryTransformManagerMock = (): jest.Mocked<TransformManager> => {
  return {
    install: jest.fn(),
    preview: jest.fn(),
    uninstall: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    inspect: jest.fn(),
    getVersion: jest.fn(),
  };
};

const createSLODefinitionRepositoryMock = (): jest.Mocked<SLODefinitionRepository> => {
  return {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findAllByIds: jest.fn(),
    deleteById: jest.fn(),
    search: jest.fn(),
  };
};

const createSummaryClientMock = (): jest.Mocked<SummaryClient> => {
  return {
    computeSummary: jest.fn(),
  };
};

const createSummarySearchClientMock = (): jest.Mocked<SummarySearchClient> => {
  return {
    search: jest.fn(),
  };
};

const createBurnRatesClientMock = (): jest.Mocked<BurnRatesClient> => {
  return {
    calculate: jest.fn(),
  };
};

export {
  createResourceInstallerMock,
  createTransformManagerMock,
  createSummaryTransformManagerMock,
  createSLODefinitionRepositoryMock as createSLORepositoryMock,
  createSummaryClientMock,
  createSummarySearchClientMock,
  createBurnRatesClientMock,
};
