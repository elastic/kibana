/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { OriginalRuleVendor } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { MigrationSource } from '../../common/types';

export interface OriginalRuleCopy {
  title: string;
  tooltip: string;
}

export interface MissingResourcesCopy {
  readyDescription: string;
  uploadTitle: string;
}

export interface CheckResourcesCopy {
  title: string;
  description: string;
}

export interface MissingLookupsListCopy {
  description: ReactNode;
  copyNameTooltip: string;
  clearEmptyTooltip: string;
  copyNameTestId: string;
  clearEmptyTestId: string;
}

export interface LookupsFileUploadCopy {
  prompt: string;
  label: string;
  filePickerId: string;
}

export interface ResourceDataInputStepCopy {
  title: string;
  description: string;
  copyTitle: string;
  fileUploadTitle: string;
}

export interface RuleMigrationVendorCopy {
  originalRule: OriginalRuleCopy;
  missingResources: MissingResourcesCopy;
  checkResources: CheckResourcesCopy;
  missingLookupsList: MissingLookupsListCopy;
  lookupsFileUpload: LookupsFileUploadCopy;
  resourceDataInputStep: ResourceDataInputStepCopy;
  copyrightNotice: string;
}

export type RuleMigrationVendor = OriginalRuleVendor | MigrationSource;
