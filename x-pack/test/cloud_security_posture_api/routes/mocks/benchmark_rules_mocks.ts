/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';

export const benchmarkRulesMockDataCSPM: CspBenchmarkRule[] = [
  {
    metadata: {
      impact: '',
      default_value: '',
      references: 'mock_ref1',
      id: '0bdfe13d-7bc8-5415-8517-65114d344798',
      name: 'CSPM_1',
      profile_applicability: '* Level 1',
      description: '',
      rationale: '',
      audit: '',
      remediation: '',
      section: 'Monitoring',
      version: '1.0',
      tags: ['CIS', 'AWS', 'CIS 4.4', 'Monitoring'],
      benchmark: {
        name: 'CIS Amazon Web Services Foundations',
        version: 'v1.5.0',
        id: 'cis_aws',
        rule_number: '4.4',
        posture_type: 'cspm',
      },
      rego_rule_id: 'cis_4_4',
    },
  },
  {
    metadata: {
      impact: '',
      default_value: '',
      references: 'mock_ref2',
      id: '06161f41-c17a-586f-b08e-c45ea5157da0',
      name: 'CSPM_2',
      profile_applicability: '* Level 1',
      description: '',
      rationale: '.',
      audit: '',
      remediation: '',
      section: 'Monitoring',
      version: '1.0',
      tags: ['CIS', 'AWS', 'CIS 4.13', 'Monitoring'],
      benchmark: {
        name: 'CIS Amazon Web Services Foundations',
        version: 'v1.5.0',
        id: 'cis_aws',
        rule_number: '4.13',
        posture_type: 'cspm',
      },
      rego_rule_id: 'cis_4_13',
    },
  },
];

export const benchmarkRulesMockDataKSPM: CspBenchmarkRule[] = [
  {
    metadata: {
      impact: 'None',
      default_value: '',
      references: 'mock_ref3',
      id: '04e01d1a-d7d4-5020-a398-8aadd3fe32ae',
      name: 'KSPM_1',
      profile_applicability: '* Level 1 - Master Node',
      description: '',
      rationale: '',
      audit: '',
      remediation: '',
      section: 'Control Plane Node Configuration Files',
      version: '1.0',
      tags: ['CIS', 'Kubernetes', 'CIS 1.1.3', 'Control Plane Node Configuration Files'],
      benchmark: {
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.1',
        id: 'cis_k8s',
        rule_number: '1.1.3',
        posture_type: 'kspm',
      },
      rego_rule_id: 'cis_1_1_3',
    },
  },
  {
    metadata: {
      impact: '',
      default_value: '',
      references: 'mock_ref4',
      id: '05c4bd94-162d-53e8-b112-e617ce74f8f6',
      name: 'KSPM_2',
      profile_applicability: '* Level 1 - Master Node',
      description: '',
      rationale: '',
      audit: '',
      remediation: '',
      section: 'Pod Security Standards',
      version: '1.0',
      tags: ['CIS', 'Kubernetes', 'CIS 5.2.8', 'Pod Security Standards'],
      benchmark: {
        name: 'CIS Kubernetes V1.23',
        version: 'v1.0.1',
        id: 'cis_k8s',
        rule_number: '5.2.8',
        posture_type: 'kspm',
      },
      rego_rule_id: 'cis_5_2_8',
    },
  },
];
