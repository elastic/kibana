/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const benchmarkValuesMock = {
  integrationType: 'KSPM',
  integrationName: 'EKS',
  resourceName: 'Clusters',
  resourceCountLabel: 'clusters',
  integrationLink: '/kbn/app/fleet/integrations/cloud_security_posture-1.12.0/add-integration/kspm',
  learnMoreLink: 'https://ela.st/kspm-get-started',
};

export const itemsDataMock = [
  {
    id: 'cis_k8s',
    name: 'CIS Kubernetes V1.23',
    version: '1.0.1',
    score: {
      totalFailed: 47,
      totalPassed: 321,
      totalFindings: 368,
      postureScore: 87.2,
      resourcesEvaluated: 180,
    },
    evaluation: 1,
  },
  {
    id: 'cis_azure',
    name: 'CIS Microsoft Azure Foundations',
    version: '2.0.0',
    score: {
      totalFailed: 0,
      totalPassed: 0,
      totalFindings: 0,
      postureScore: 0,
    },
    evaluation: 0,
  },
  {
    id: 'cis_gcp',
    name: 'CIS Google Cloud Platform Foundation',
    version: '2.0.0',
    score: {
      totalFailed: 366,
      totalPassed: 62,
      totalFindings: 428,
      postureScore: 14.5,
      resourcesEvaluated: 376,
    },
    evaluation: 1,
  },
  {
    id: 'cis_aws',
    name: 'CIS Amazon Web Services Foundations',
    version: '1.5.0',
    score: {
      totalFailed: 0,
      totalPassed: 0,
      totalFindings: 0,
      postureScore: 0,
    },
    evaluation: 0,
  },
  {
    id: 'cis_eks',
    name: 'CIS Amazon Elastic Kubernetes Service (EKS)',
    version: '1.0.1',
    score: {
      totalFailed: 20,
      totalPassed: 62,
      totalFindings: 82,
      postureScore: 75.6,
      resourcesEvaluated: 14,
    },
    evaluation: 1,
  },
];

export const paramsMock = {
  benchmarkId: 'cis_eks',
  benchmarkVersion: '1.0.1',
};
