/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const timeFiveHoursAgo = (Date.now() - 18000000).toString();

export const latestFindingsMock = [
  {
    agent: {
      name: 'ip-172-31-47-181.eu-west-1.compute.internal',
      id: '02802a08-d12e-44f2-8e81-55c0ddc76e80',
      ephemeral_id: '2fc424fe-de3b-4441-98d8-c40e39cb4703',
      type: 'cloudbeat',
      version: '8.12.0',
    },
    resource: {
      sub_type: 'aws-s3',
      name: 'tf-state-bucket-test-infra',
      raw: {
        sse_algorithm: 'AES256',
        account_public_access_block_configuration: null,
        bucket_policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 's3:ListBucket',
              Resource: 'arn:aws:s3:::tf-state-bucket-test-infra',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::704479110758:user/dmitry.gurevich@elastic.co',
              },
            },
            {
              Action: ['s3:GetObject', 's3:PutObject'],
              Resource: 'arn:aws:s3:::tf-state-bucket-test-infra/*',
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::704479110758:user/dmitry.gurevich@elastic.co',
              },
            },
          ],
        },
        public_access_block_configuration: {
          RestrictPublicBuckets: true,
          BlockPublicPolicy: true,
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
        },
        name: 'tf-state-bucket-test-infra',
        bucket_versioning: {
          MfaDelete: false,
          Enabled: false,
        },
      },
      id: 'arn:aws:s3:::tf-state-bucket-test-infra',
      type: 'cloud-storage',
      region: 'eu-west-3',
    },
    cloud_security_posture: {
      package_policy: {
        id: 'a26fb029-4bd0-462c-a3d6-96f5b3f91603',
        revision: 3,
      },
    },
    elastic_agent: {
      id: '02802a08-d12e-44f2-8e81-55c0ddc76e80',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references:
        '1. https://docs.aws.amazon.com/AmazonS3/latest/user-guide/default-bucket-encryption.html\n2. https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html#bucket-encryption-related-resources',
      impact:
        'Amazon S3 buckets with default bucket encryption using SSE-KMS cannot be used as destination buckets for Amazon S3 server access logging. Only SSE-S3 default encryption is supported for server access log destination buckets.',
      description:
        'Amazon S3 provides a variety of no, or low, cost encryption options to protect data at rest.',
      default_value: '',
      section: 'Simple Storage Service (S3)',
      rationale:
        'Encrypting data at rest reduces the likelihood that it is unintentionally exposed and can nullify the impact of disclosure if the encryption remains unbroken.',
      version: '1.0',
      benchmark: {
        name: 'CIS Amazon Web Services Foundations',
        rule_number: '2.1.1',
        id: 'cis_aws',
        version: 'v1.5.0',
        posture_type: 'cspm',
      },
      tags: ['CIS', 'AWS', 'CIS 2.1.1', 'Simple Storage Service (S3)'],
      remediation:
        '**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select a Bucket.\n3. Click on \'Properties\'.\n4. Click edit on `Default Encryption`.\n5. Select either `AES-256`, `AWS-KMS`, `SSE-KMS` or `SSE-S3`.\n6. Click `Save`\n7. Repeat for all the buckets in your AWS account lacking encryption.\n\n**From Command Line:**\n\nRun either \n```\naws s3api put-bucket-encryption --bucket <bucket name> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}\'\n```\n or \n```\naws s3api put-bucket-encryption --bucket <bucket name> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms","KMSMasterKeyID": "aws/s3"}}]}\'\n```\n\n**Note:** the KMSMasterKeyID can be set to the master key of your choosing; aws/s3 is an AWS preconfigured default.',
      audit:
        '**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select a Bucket.\n3. Click on \'Properties\'.\n4. Verify that `Default Encryption` is enabled, and displays either `AES-256`, `AWS-KMS`, `SSE-KMS` or `SSE-S3`.\n5. Repeat for all the buckets in your AWS account.\n\n**From Command Line:**\n\n6. Run command to list buckets\n```\naws s3 ls\n```\n7. For each bucket, run \n```\naws s3api get-bucket-encryption --bucket <bucket name>\n```\n8. Verify that either \n```\n"SSEAlgorithm": "AES256"\n```\n or \n```\n"SSEAlgorithm": "aws:kms"```\n is displayed.',
      name: 'Ensure all S3 buckets employ encryption-at-rest',
      id: '76be4dd2-a77a-5981-a893-db6770b35911',
      profile_applicability: '* Level 2',
    },
    message: 'Rule "Ensure all S3 buckets employ encryption-at-rest": passed',
    error: {
      message: ['field [cluster_id] not present as part of path [cluster_id]'],
    },
    cloud: {
      provider: 'aws',
      service: {
        name: 'S3',
      },
      region: 'eu-west-3',
      account: {
        name: 'elastic-security-cloud-security-dev',
        id: '704479110758',
      },
    },
    result: {
      evaluation: 'passed',
      evidence: {
        SSEAlgorithm: 'AES256',
      },
      expected: null,
    },
    '@timestamp': timeFiveHoursAgo,
    ecs: {
      version: '8.6.0',
    },
    cloudbeat: {
      commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
      commit_time: '2024-01-11T09:14:22Z',
      version: '8.12.0',
      policy: {
        commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
        commit_time: '2024-01-11T09:14:22Z',
        version: '8.12.0',
      },
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'ip-172-31-47-181.eu-west-1.compute.internal',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1706097266,
      ingested: '2024-01-24T13:04:32Z',
      created: '2024-01-24T11:56:24.907298252Z',
      kind: 'pipeline_error',
      id: '45716b41-9fc1-4221-907a-42b3f746d2c8',
      category: ['configuration'],
      type: ['info'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
  {
    agent: {
      name: 'ip-172-31-47-181.eu-west-1.compute.internal',
      id: '02802a08-d12e-44f2-8e81-55c0ddc76e80',
      type: 'cloudbeat',
      ephemeral_id: '2fc424fe-de3b-4441-98d8-c40e39cb4703',
      version: '8.12.0',
    },
    resource: {
      sub_type: 'aws-s3',
      name: 'aws-cloudtrail-logs-704479110758-public-access',
      raw: {
        sse_algorithm: 'AES256',
        account_public_access_block_configuration: null,
        bucket_policy: {
          Version: '2012-10-17',
          Statement: [
            {
              Condition: {
                StringEquals: {
                  'AWS:SourceArn':
                    'arn:aws:cloudtrail:us-west-2:704479110758:trail/test-aws-s3-public-access-failed',
                },
              },
              Action: 's3:GetBucketAcl',
              Resource: 'arn:aws:s3:::aws-cloudtrail-logs-704479110758-public-access',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudtrail.amazonaws.com',
              },
              Sid: 'AWSCloudTrailAclCheck20150319',
            },
            {
              Condition: {
                StringEquals: {
                  'AWS:SourceArn':
                    'arn:aws:cloudtrail:us-west-2:704479110758:trail/test-aws-s3-public-access-failed',
                  's3:x-amz-acl': 'bucket-owner-full-control',
                },
              },
              Action: 's3:PutObject',
              Resource:
                'arn:aws:s3:::aws-cloudtrail-logs-704479110758-public-access/AWSLogs/704479110758/*',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudtrail.amazonaws.com',
              },
              Sid: 'AWSCloudTrailWrite20150319',
            },
          ],
        },
        public_access_block_configuration: {
          RestrictPublicBuckets: true,
          BlockPublicPolicy: true,
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
        },
        name: 'aws-cloudtrail-logs-704479110758-public-access',
        bucket_versioning: {
          MfaDelete: false,
          Enabled: false,
        },
      },
      id: 'arn:aws:s3:::aws-cloudtrail-logs-704479110758-public-access',
      region: 'us-west-2',
      type: 'cloud-storage',
    },
    cloud_security_posture: {
      package_policy: {
        id: 'a26fb029-4bd0-462c-a3d6-96f5b3f91603',
        revision: 3,
      },
    },
    elastic_agent: {
      id: '02802a08-d12e-44f2-8e81-55c0ddc76e80',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references:
        '1. https://docs.aws.amazon.com/AmazonS3/latest/user-guide/block-public-access-account.html',
      impact:
        'When you apply Block Public Access settings to an account, the settings apply to all AWS Regions globally. The settings might not take effect in all Regions immediately or simultaneously, but they eventually propagate to all Regions.',
      description:
        'Amazon S3 provides `Block public access (bucket settings)` and `Block public access (account settings)` to help you manage public access to Amazon S3 resources.\nBy default, S3 buckets and objects are created with public access disabled.\nHowever, an IAM principal with sufficient S3 permissions can enable public access at the bucket and/or object level.\nWhile enabled, `Block public access (bucket settings)` prevents an individual bucket, and its contained objects, from becoming publicly accessible.\nSimilarly, `Block public access (account settings)` prevents all buckets, and contained objects, from becoming publicly accessible across the entire account.',
      section: 'Simple Storage Service (S3)',
      default_value: '',
      rationale:
        'Amazon S3 `Block public access (bucket settings)` prevents the accidental or malicious public exposure of data contained within the respective bucket(s).\n\n\nAmazon S3 `Block public access (account settings)` prevents the accidental or malicious public exposure of data contained within all buckets of the respective AWS account.\n\nWhether blocking public access to all or some buckets is an organizational decision that should be based on data sensitivity, least privilege, and use case.',
      version: '1.0',
      benchmark: {
        name: 'CIS Amazon Web Services Foundations',
        rule_number: '2.1.5',
        id: 'cis_aws',
        version: 'v1.5.0',
        posture_type: 'cspm',
      },
      tags: ['CIS', 'AWS', 'CIS 2.1.5', 'Simple Storage Service (S3)'],
      remediation:
        "**If utilizing Block Public Access (bucket settings)**\n\n**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select the Check box next to the Bucket.\n3. Click on 'Edit public access settings'.\n4. Click 'Block all public access'\n5. Repeat for all the buckets in your AWS account that contain sensitive data.\n\n**From Command Line:**\n\n6. List all of the S3 Buckets\n```\naws s3 ls\n```\n7. Set the Block Public Access to true on that bucket\n```\naws s3api put-public-access-block --bucket <name-of-bucket> --public-access-block-configuration \"BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\"\n```\n\n**If utilizing Block Public Access (account settings)**\n\n**From Console:**\n\nIf the output reads `true` for the separate configuration settings then it is set on the account.\n\n8. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n9. Choose `Block Public Access (account settings)`\n10. Choose `Edit` to change the block public access settings for all the buckets in your AWS account\n11. Choose the settings you want to change, and then choose `Save`. For details about each setting, pause on the `i` icons.\n12. When you're asked for confirmation, enter `confirm`. Then Click `Confirm` to save your changes.\n\n**From Command Line:**\n\nTo set Block Public access settings for this account, run the following command:\n```\naws s3control put-public-access-block\n--public-access-block-configuration BlockPublicAcls=true, IgnorePublicAcls=true, BlockPublicPolicy=true, RestrictPublicBuckets=true\n--account-id <value>\n```",
      audit:
        '**If utilizing Block Public Access (bucket settings)**\n\n**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select the Check box next to the Bucket.\n3. Click on \'Edit public access settings\'.\n4. Ensure that block public access settings are set appropriately for this bucket\n5. Repeat for all the buckets in your AWS account.\n\n**From Command Line:**\n\n6. List all of the S3 Buckets\n```\naws s3 ls\n```\n7. Find the public access setting on that bucket\n```\naws s3api get-public-access-block --bucket <name-of-the-bucket>\n```\nOutput if Block Public access is enabled:\n\n```\n{\n "PublicAccessBlockConfiguration": {\n "BlockPublicAcls": true,\n "IgnorePublicAcls": true,\n "BlockPublicPolicy": true,\n "RestrictPublicBuckets": true\n }\n}\n```\n\nIf the output reads `false` for the separate configuration settings then proceed to the remediation.\n\n**If utilizing Block Public Access (account settings)**\n\n**From Console:**\n\n8. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n9. Choose `Block public access (account settings)`\n10. Ensure that block public access settings are set appropriately for your AWS account.\n\n**From Command Line:**\n\nTo check Public access settings for this account status, run the following command,\n`aws s3control get-public-access-block --account-id <ACCT_ID> --region <REGION_NAME>`\n\nOutput if Block Public access is enabled:\n\n```\n{\n "PublicAccessBlockConfiguration": {\n "IgnorePublicAcls": true, \n "BlockPublicPolicy": true, \n "BlockPublicAcls": true, \n "RestrictPublicBuckets": true\n }\n}\n```\n\nIf the output reads `false` for the separate configuration settings then proceed to the remediation.',
      name: "Ensure that S3 Buckets are configured with 'Block public access (bucket settings)'",
      id: '34b16c08-cf25-5f0d-afed-98f75b5513de',
      profile_applicability: '* Level 1',
    },
    message:
      'Rule "Ensure that S3 Buckets are configured with \'Block public access (bucket settings)\'": passed',
    error: {
      message: ['field [cluster_id] not present as part of path [cluster_id]'],
    },
    cloud: {
      provider: 'aws',
      service: {
        name: 'S3',
      },
      region: 'us-west-2',
      account: {
        name: 'elastic-security-cloud-security-dev',
        id: '704479110758',
      },
    },
    result: {
      evaluation: 'passed',
      evidence: {
        PublicAccessBlockConfiguration: {
          RestrictPublicBuckets: true,
          BlockPublicPolicy: true,
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
        },
        AccountPublicAccessBlockConfiguration: null,
      },
      expected: null,
    },
    '@timestamp': timeFiveHoursAgo,
    ecs: {
      version: '8.6.0',
    },
    cloudbeat: {
      commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
      commit_time: '2024-01-11T09:14:22Z',
      version: '8.12.0',
      policy: {
        commit_sha: 'b23ca39a0ca08aa94f8e4a644517bb73f3cf1f66',
        commit_time: '2024-01-11T09:14:22Z',
        version: '8.12.0',
      },
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'ip-172-31-47-181.eu-west-1.compute.internal',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1706097266,
      ingested: '2024-01-24T13:05:49Z',
      created: '2024-01-24T11:56:24.895595155Z',
      kind: 'pipeline_error',
      id: '9e2d1c89-7f4f-4f2f-b1fb-20b8e40a6613',
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
  {
    agent: {
      name: 'ip-172-31-35-244',
      id: '262471f4-c052-45df-863f-cc62dcb3a218',
      type: 'cloudbeat',
      ephemeral_id: 'a123ad16-78c3-4456-b995-d35b76f446a8',
      version: '8.12.0',
    },
    resource: {
      sub_type: 'aws-s3',
      name: 'test-aws-public-access-allowed-fail',
      raw: {
        sse_algorithm: 'AES256',
        account_public_access_block_configuration: null,
        public_access_block_configuration: {
          RestrictPublicBuckets: false,
          BlockPublicPolicy: false,
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
        },
        name: 'test-aws-public-access-allowed-fail',
        bucket_versioning: {
          MfaDelete: false,
          Enabled: false,
        },
      },
      id: 'arn:aws:s3:::test-aws-public-access-allowed-fai8',
      region: 'eu-west-1',
      type: 'cloud-storage',
    },
    cloud_security_posture: {
      package_policy: {
        id: '2efdfc05-6de8-499d-9bc4-a8554b7c7d88',
        revision: 2,
      },
    },
    elastic_agent: {
      id: '262471f4-c052-45df-863f-cc62dcb3a219',
      version: '8.12.0',
      snapshot: false,
    },
    rule: {
      references:
        '1. https://docs.aws.amazon.com/AmazonS3/latest/user-guide/default-bucket-encryption.html\n2. https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html#bucket-encryption-related-resources',
      impact:
        'Amazon S3 buckets with default bucket encryption using SSE-KMS cannot be used as destination buckets for Amazon S3 server access logging. Only SSE-S3 default encryption is supported for server access log destination buckets.',
      description:
        'Amazon S3 provides a variety of no, or low, cost encryption options to protect data at rest.',
      default_value: '',
      section: 'Simple Storage Service (S3)',
      rationale:
        'Encrypting data at rest reduces the likelihood that it is unintentionally exposed and can nullify the impact of disclosure if the encryption remains unbroken.',
      version: '1.0',
      benchmark: {
        name: 'CIS Amazon Web Services Foundations',
        rule_number: '2.1.1',
        id: 'cis_aws',
        version: 'v1.5.0',
        posture_type: 'cspm',
      },
      tags: ['CIS', 'AWS', 'CIS 2.1.1', 'Simple Storage Service (S3)'],
      remediation:
        '**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select a Bucket.\n3. Click on \'Properties\'.\n4. Click edit on `Default Encryption`.\n5. Select either `AES-256`, `AWS-KMS`, `SSE-KMS` or `SSE-S3`.\n6. Click `Save`\n7. Repeat for all the buckets in your AWS account lacking encryption.\n\n**From Command Line:**\n\nRun either \n```\naws s3api put-bucket-encryption --bucket <bucket name> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}\'\n```\n or \n```\naws s3api put-bucket-encryption --bucket <bucket name> --server-side-encryption-configuration \'{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms","KMSMasterKeyID": "aws/s3"}}]}\'\n```\n\n**Note:** the KMSMasterKeyID can be set to the master key of your choosing; aws/s3 is an AWS preconfigured default.',
      audit:
        '**From Console:**\n\n1. Login to AWS Management Console and open the Amazon S3 console using https://console.aws.amazon.com/s3/ \n2. Select a Bucket.\n3. Click on \'Properties\'.\n4. Verify that `Default Encryption` is enabled, and displays either `AES-256`, `AWS-KMS`, `SSE-KMS` or `SSE-S3`.\n5. Repeat for all the buckets in your AWS account.\n\n**From Command Line:**\n\n6. Run command to list buckets\n```\naws s3 ls\n```\n7. For each bucket, run \n```\naws s3api get-bucket-encryption --bucket <bucket name>\n```\n8. Verify that either \n```\n"SSEAlgorithm": "AES256"\n```\n or \n```\n"SSEAlgorithm": "aws:kms"```\n is displayed.',
      name: 'Ensure all S3 buckets employ encryption-at-rest',
      id: '76be4dd2-a77a-5981-a893-db6770b35911',
      profile_applicability: '* Level 2',
    },
    message: 'Rule "Ensure all S3 buckets employ encryption-at-rest": passed',
    error: {
      message: ['field [cluster_id] not present as part of path [cluster_id]'],
    },
    result: {
      evaluation: 'failed',
      evidence: {
        SSEAlgorithm: 'AES256',
      },
      expected: null,
    },
    cloud: {
      provider: 'aws',
      service: {
        name: 'S3',
      },
      region: 'eu-west-1',
      account: {
        name: 'elastic-security-cloud-security-dev',
        id: '704479110758',
      },
    },
    '@timestamp': timeFiveHoursAgo,
    ecs: {
      version: '8.6.0',
    },
    cloudbeat: {
      commit_sha: '5839f247c64cf212bf52312a41450a172ecfa97b',
      commit_time: '2023-12-19T08:06:46Z',
      version: '8.12.0',
      policy: {
        commit_sha: '5839f247c64cf212bf52312a41450a172ecfa97b',
        commit_time: '2023-12-19T08:06:46Z',
        version: '8.12.0',
      },
    },
    data_stream: {
      namespace: 'default',
      type: 'logs',
      dataset: 'cloud_security_posture.findings',
    },
    host: {
      name: 'ip-172-31-35-244',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      sequence: 1703952296,
      ingested: '2024-01-24T10:12:00Z',
      created: '2023-12-30T16:06:51.498685598Z',
      kind: 'pipeline_error',
      id: 'b6db0a06-6b81-4c13-b186-32c9a7935f94',
      type: ['info'],
      category: ['configuration'],
      dataset: 'cloud_security_posture.findings',
      outcome: 'success',
    },
  },
];
