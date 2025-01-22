/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Truthy } from 'lodash';
import type { BaseCspSetupStatus, BenchmarksCisId } from '@kbn/cloud-security-posture-common';
import {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
  PackagePolicyInput,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import type { BenchmarkRuleSelectParams } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import type { BenchmarkRuleSelectParams as BenchmarkRuleSelectParamsV4 } from '@kbn/cloud-security-posture-common/schema/rules/v4';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  CLOUDBEAT_VANILLA,
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  AWS_CREDENTIALS_TYPE_TO_FIELDS_MAP,
  GCP_CREDENTIALS_TYPE_TO_FIELDS_MAP,
  AZURE_CREDENTIALS_TYPE_TO_FIELDS_MAP,
} from '../constants';
import type {
  BenchmarkId,
  Score,
  AwsCredentialsType,
  GcpCredentialsType,
  AzureCredentialsType,
  RuleSection,
} from '../types_old';

/**
 * @example
 * declare const foo: Array<string | undefined | null>
 * foo.filter(isNonNullable) // foo is Array<string>
 */
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

export const truthy = <T>(value: T): value is Truthy<T> => !!value;

export const getBenchmarkFilter = (type: BenchmarkId, section?: RuleSection): string =>
  `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id: "${type}"${
    section
      ? ` AND ${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.section: "${section}"`
      : ''
  }`;

export const isEnabledBenchmarkInputType = (input: PackagePolicyInput | NewPackagePolicyInput) =>
  input.enabled;

export const isCspPackage = (packageName?: string) =>
  packageName === CLOUD_SECURITY_POSTURE_PACKAGE_NAME;

export const getBenchmarkFromPackagePolicy = (
  inputs: PackagePolicy['inputs'] | NewPackagePolicy['inputs']
): BenchmarkId => {
  const enabledInputs = inputs.filter(isEnabledBenchmarkInputType);

  // Use the only enabled input
  if (enabledInputs.length === 1) {
    return getInputType(enabledInputs[0].type);
  }

  // Use the default benchmark id for multiple/none selected
  return getInputType(CLOUDBEAT_VANILLA);
};

const getInputType = (inputType: string): string => {
  // Get the last part of the input type, input type structure: cloudbeat/<benchmark_id>
  return inputType.split('/')[1];
};

export const CSP_FLEET_PACKAGE_KUERY = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`;

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (passed: number, failed: number): Score => {
  const total = passed + failed;
  if (total === 0) return total;

  return roundScore(passed / (passed + failed));
};

export const getStatusForIndexName = (indexName: string, status?: BaseCspSetupStatus) => {
  if (status) {
    const indexDetail = status.indicesDetails.find(
      (details) => details.index.indexOf(indexName) !== -1
    );

    if (indexDetail) {
      return indexDetail.status;
    }
  }

  return 'unknown';
};

export const cleanupCredentials = (packagePolicy: NewPackagePolicy | UpdatePackagePolicy) => {
  const enabledInput = packagePolicy.inputs.find((i) => i.enabled);
  const awsCredentialType: AwsCredentialsType | undefined =
    enabledInput?.streams?.[0].vars?.['aws.credentials.type']?.value;
  const gcpCredentialType: GcpCredentialsType | undefined =
    enabledInput?.streams?.[0].vars?.['gcp.credentials.type']?.value;
  const azureCredentialType: AzureCredentialsType | undefined =
    enabledInput?.streams?.[0].vars?.['azure.credentials.type']?.value;

  if (awsCredentialType || gcpCredentialType || azureCredentialType) {
    let credsToKeep: string[] = [' '];
    let credFields: string[] = [' '];
    if (awsCredentialType) {
      credsToKeep = AWS_CREDENTIALS_TYPE_TO_FIELDS_MAP[awsCredentialType];
      credFields = Object.values(AWS_CREDENTIALS_TYPE_TO_FIELDS_MAP).flat();
    } else if (gcpCredentialType) {
      credsToKeep = GCP_CREDENTIALS_TYPE_TO_FIELDS_MAP[gcpCredentialType];
      credFields = Object.values(GCP_CREDENTIALS_TYPE_TO_FIELDS_MAP).flat();
    } else if (azureCredentialType) {
      credsToKeep = AZURE_CREDENTIALS_TYPE_TO_FIELDS_MAP[azureCredentialType];
      credFields = Object.values(AZURE_CREDENTIALS_TYPE_TO_FIELDS_MAP).flat();
    }

    if (credsToKeep) {
      // we need to return a copy of the policy with the unused
      // credentials set to undefined
      return {
        ...packagePolicy,
        inputs: packagePolicy.inputs.map((input) => {
          if (input.enabled) {
            return {
              ...input,
              streams: input.streams.map((stream) => {
                const vars = stream.vars;
                for (const field in vars) {
                  if (!credsToKeep.includes(field) && credFields.includes(field)) {
                    vars[field].value = undefined;
                  }
                }

                return {
                  ...stream,
                  vars,
                };
              }),
            };
          }

          return input;
        }),
      };
    }
  }

  // nothing to do, return unmutated policy
  return packagePolicy;
};

export const getBenchmarkCisName = (benchmarkId: BenchmarksCisId) => {
  switch (benchmarkId) {
    case 'cis_k8s':
      return 'CIS Kubernetes';
    case 'cis_azure':
      return 'CIS Azure';
    case 'cis_aws':
      return 'CIS AWS';
    case 'cis_eks':
      return 'CIS EKS';
    case 'cis_gcp':
      return 'CIS GCP';
  }
};

const CLOUD_PROVIDER_NAMES = {
  AWS: 'Amazon Web Services',
  AZURE: 'Microsoft Azure',
  GCP: 'Google Cloud Platform',
};

export const CLOUD_PROVIDERS = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp',
};

/**
 * Returns the cloud provider name or benchmark applicable name for the given benchmark id
 */
export const getBenchmarkApplicableTo = (benchmarkId: BenchmarksCisId) => {
  switch (benchmarkId) {
    case 'cis_k8s':
      return 'Kubernetes';
    case 'cis_azure':
      return CLOUD_PROVIDER_NAMES.AZURE;
    case 'cis_aws':
      return CLOUD_PROVIDER_NAMES.AWS;
    case 'cis_eks':
      return 'Amazon Elastic Kubernetes Service (EKS)';
    case 'cis_gcp':
      return CLOUD_PROVIDER_NAMES.GCP;
  }
};

export const getCloudProviderNameFromAbbreviation = (cloudProvider: string) => {
  switch (cloudProvider.toLowerCase()) {
    case 'azure':
      return CLOUD_PROVIDER_NAMES.AZURE;
    case 'aws':
      return CLOUD_PROVIDER_NAMES.AWS;
    case 'gcp':
      return CLOUD_PROVIDER_NAMES.GCP;
    default:
      return cloudProvider;
  }
};

export const getBenchmarkFilterQuery = (
  benchmarkId: BenchmarkId,
  benchmarkVersion?: string,
  selectParams?: BenchmarkRuleSelectParamsV4
): string => {
  const baseQuery = `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id:${benchmarkId} AND ${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.version:"v${benchmarkVersion}"`;
  const sectionQuery = selectParams?.section
    ? ` AND ${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.section: "${selectParams.section}"`
    : '';
  const ruleNumberQuery = selectParams?.ruleNumber
    ? ` AND ${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.rule_number: "${selectParams.ruleNumber}"`
    : '';
  return baseQuery + sectionQuery + ruleNumberQuery;
};

export const getBenchmarkFilterQueryV2 = (
  benchmarkId: BenchmarkId,
  benchmarkVersion?: string,
  selectParams?: BenchmarkRuleSelectParams
): string => {
  const baseQuery = `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id:${benchmarkId} AND ${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.version:"v${benchmarkVersion}"`;

  let sectionQuery = '';
  let ruleNumberQuery = '';
  if (selectParams?.section) {
    const sectionParamsArr = selectParams.section?.map(
      (params) => `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.section: "${params}"`
    );
    sectionQuery = ' AND (' + sectionParamsArr.join(' OR ') + ')';
  }
  if (selectParams?.ruleNumber) {
    const ruleNumbersParamsArr = selectParams.ruleNumber?.map(
      (params) =>
        `${CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.rule_number: "${params}"`
    );
    ruleNumberQuery = ' AND (' + ruleNumbersParamsArr.join(' OR ') + ')';
  }

  return baseQuery + sectionQuery + ruleNumberQuery;
};
