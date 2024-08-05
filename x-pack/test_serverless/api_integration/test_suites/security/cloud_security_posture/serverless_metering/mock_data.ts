/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';

const chance = new Chance();

// see https://github.com/elastic/security-team/issues/8970 for billable asset definition
export const BILLABLE_ASSETS_CONFIG = {
  cspm: [
    // 'aws-ebs', we can't include EBS volumes until https://github.com/elastic/security-team/issues/9283 is resolved
    // 'aws-ec2', we can't include EC2 instances until https://github.com/elastic/security-team/issues/9254 is resolved
    'aws-s3',
    'aws-rds',
    'azure-disk',
    'azure-document-db-database-account',
    'azure-flexible-mysql-server-db',
    'azure-flexible-postgresql-server-db',
    'azure-mysql-server-db',
    'azure-postgresql-server-db',
    'azure-sql-server',
    'azure-storage-account',
    'azure-vm',
    'gcp-bigquery-dataset',
    'gcp-compute-disk',
    'gcp-compute-instance',
    'gcp-sqladmin-instance',
    'gcp-storage-bucket',
  ],
  kspm: ['Node', 'node'],
};
export const getMockFindings = ({
  postureType,
  isBillableAsset,
  numberOfFindings,
}: {
  postureType: string;
  isBillableAsset?: boolean;
  numberOfFindings: number;
}) => {
  return Array.from({ length: numberOfFindings }, () => mockFiniding(postureType, isBillableAsset));
};

const mockFiniding = (postureType: string, isBillableAsset?: boolean) => {
  if (postureType === 'cspm') {
    const randomAsset = isBillableAsset
      ? chance.pickone(BILLABLE_ASSETS_CONFIG.cspm)
      : 'not-billable-asset';
    return {
      resource: { id: chance.guid(), sub_type: randomAsset },
      rule: {
        benchmark: {
          posture_type: 'cspm',
        },
      },
    };
  }
  if (postureType === 'kspm') {
    const randomAsset = isBillableAsset
      ? chance.pickone(BILLABLE_ASSETS_CONFIG.kspm)
      : 'not-billable-asset';

    return {
      resource: { id: chance.guid(), sub_type: randomAsset },
      rule: {
        benchmark: {
          posture_type: 'kspm',
        },
      },
      agent: { id: chance.guid() },
    };
  }
  if (postureType === 'cnvm') {
    return {
      cloud: {
        instance: {
          id: chance.guid(),
        },
      },
    };
  }
};

export const getMockDefendForContainersHeartbeats = ({
  isBlockActionEnables,
  numberOfHearbeats,
}: {
  isBlockActionEnables: boolean;
  numberOfHearbeats: number;
}) => {
  return Array.from({ length: numberOfHearbeats }, () =>
    mockDefendForContainersHeartbeats(isBlockActionEnables)
  );
};
const mockDefendForContainersHeartbeats = (isBlockActionEnables: boolean) => {
  return {
    agent: {
      id: chance.guid(),
    },
    cloud_defend: {
      block_action_enabled: isBlockActionEnables,
    },
    event: {
      ingested: new Date().toISOString(),
    },
  };
};
