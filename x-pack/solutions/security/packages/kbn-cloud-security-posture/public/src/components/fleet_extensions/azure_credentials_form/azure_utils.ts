/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { hasPolicyTemplateInputs } from '../utils';
import { AZURE_CREDENTIALS_TYPE } from '../constants';

export const getArmTemplateUrlFromCspmPackage = (
  packageInfo: PackageInfo,
  templateName: string
): string => {
  if (!packageInfo.policy_templates) return '';

  const policyTemplate = packageInfo.policy_templates.find((p) => p.name === templateName);
  if (!policyTemplate) return '';

  const policyTemplateInputs = hasPolicyTemplateInputs(policyTemplate) && policyTemplate.inputs;
  if (!policyTemplateInputs) return '';

  const armTemplateUrl = policyTemplateInputs.reduce((acc, input): string => {
    if (!input.vars) return acc;
    const template = input.vars.find((v) => v.name === 'arm_template_url')?.default;
    return template ? String(template) : acc;
  }, '');

  return armTemplateUrl;
};

export const getDefaultAzureCredentialsType = (
  packageInfo: PackageInfo,
  templateName: string,
  setupTechnology?: SetupTechnology
): string => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET;
  }

  const hasArmTemplateUrl = !!getArmTemplateUrlFromCspmPackage(packageInfo, templateName);
  if (hasArmTemplateUrl) {
    return AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;
  }

  return AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY;
};
