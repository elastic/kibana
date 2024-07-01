/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

export const cspmFindingsMockDataForMetering = [
  {
    resource: { id: chance.guid(), name: `Pod`, sub_type: 'aws-s3' },
    rule: {
      benchmark: {
        posture_type: 'cspm',
      },
      type: 'process',
    },
  },
  {
    resource: { id: chance.guid(), name: `Pod`, sub_type: 'aws-rds' },
    rule: {
      benchmark: {
        posture_type: 'cspm',
      },
      type: 'process',
    },
  },
  {
    resource: { id: chance.guid(), name: `Pod`, sub_type: 'not-billable-asset' },
    rule: {
      benchmark: {
        posture_type: 'cspm',
      },
      type: 'process',
    },
  },
];
export const kspmFindingsMockDataForMetering = [
  {
    resource: { id: chance.guid(), name: `kubelet`, sub_type: 'node' },
    rule: {
      benchmark: {
        posture_type: 'kspm',
      },
    },
    agent: { id: chance.guid() },
  },
  {
    resource: { id: chance.guid(), name: `kubelet`, sub_type: 'not billable resource' },
    rule: {
      benchmark: {
        posture_type: 'kspm',
      },
    },
    agent: { id: chance.guid() },
  },
];

export const cnvmFindingsMockDataForMetering = [
  {
    cloud: {
      instance: {
        id: chance.guid(),
      },
    },
  },
  {
    cloud: {
      instance: {
        id: chance.guid(),
      },
    },
  },
];

export const defendForContainersHeartbeatsForMetering = [
  {
    agent: {
      id: chance.guid(),
    },
    cloud_defend: {
      block_action_enabled: true,
    },
    event: {
      ingested: new Date().toISOString(),
    },
  },
  {
    agent: {
      id: chance.guid(),
    },
    cloud_defend: {
      block_action_enabled: true,
    },
    event: {
      ingested: new Date().toISOString(),
    },
  },
];
