/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from '@kbn/zod';

import type { RuleSnooze } from '@kbn/alerting-plugin/common';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import type { RuleSnoozeSettings } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { WarningSchema } from '../../../../common/api/detection_engine';
import type { RuleExecutionStatus } from '../../../../common/api/detection_engine/rule_monitoring';

import { SortOrder } from '../../../../common/api/detection_engine';
import type {
  RuleCreateProps,
  RuleResponse,
  RuleUpdateProps,
} from '../../../../common/api/detection_engine/model/rule_schema';
import type {
  CoverageOverviewFilter,
  PatchRuleRequestBody,
} from '../../../../common/api/detection_engine/rule_management';
import { FindRulesSortField } from '../../../../common/api/detection_engine/rule_management';
import type { GapRangeValue } from '../../rule_gaps/constants';
export interface CreateRulesProps {
  rule: RuleCreateProps;
  signal?: AbortSignal;
}

export interface PreviewRulesProps {
  rule: RuleCreateProps & {
    invocationCount: number;
    timeframeEnd: string;
  };
  enableLoggedRequests?: boolean;
  signal?: AbortSignal;
}

export interface UpdateRulesProps {
  rule: RuleUpdateProps;
  signal?: AbortSignal;
}

export interface PatchRuleProps {
  ruleProperties: PatchRuleRequestBody;
  signal?: AbortSignal;
}

export type Rule = RuleResponse;

export type PaginationOptions = z.infer<typeof PaginationOptions>;
export const PaginationOptions = z.object({
  page: z.number().int().min(0),
  perPage: z.number().int().min(0),
  total: z.number().int().min(0),
});

export interface FetchRulesProps {
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
  filterOptions?: FilterOptions;
  sortingOptions?: SortingOptions;
  gapsRange?: {
    start: string;
    end: string;
  };
  signal?: AbortSignal;
}

// Rule snooze settings map keyed by rule SO's id (not ruleId) and valued by rule snooze settings
export type RulesSnoozeSettingsMap = Record<string, RuleSnoozeSettings>;

interface RuleSnoozeSettingsResponse {
  /**
   * Rule's SO id
   */
  id: string;
  name: string;
  mute_all: boolean;
  snooze_schedule?: RuleSnooze;
  active_snoozes?: string[];
  is_snoozed_until?: string;
}

export interface RulesSnoozeSettingsBatchResponse {
  data: RuleSnoozeSettingsResponse[];
}

export type SortingOptions = z.infer<typeof SortingOptions>;
export const SortingOptions = z.object({
  field: FindRulesSortField,
  order: SortOrder,
});

export interface FilterOptions {
  filter: string;
  showCustomRules: boolean;
  showElasticRules: boolean;
  tags: string[];
  excludeRuleTypes?: Type[];
  enabled?: boolean; // undefined is to display all the rules
  ruleExecutionStatus?: RuleExecutionStatus; // undefined means "all"
  ruleSource?: RuleCustomizationEnum[]; // undefined is to display all the rules
  showRulesWithGaps?: boolean;
  gapSearchRange?: GapRangeValue;
}

export interface FetchRulesResponse {
  page: number;
  perPage: number;
  total: number;
  data: RuleResponse[];
}

export interface FetchRuleProps {
  id: string;
  signal?: AbortSignal;
}

export interface FetchRuleSnoozingProps {
  ids: string[];
  signal?: AbortSignal;
}

export interface FetchCoverageOverviewProps {
  filter: CoverageOverviewFilter;
  signal?: AbortSignal;
}

export interface BasicFetchProps {
  signal: AbortSignal;
}

export interface ImportDataProps {
  fileToImport: File;
  overwrite?: boolean;
  overwriteExceptions?: boolean;
  overwriteActionConnectors?: boolean;
  signal?: AbortSignal;
}

export interface ImportRulesResponseError {
  rule_id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ImportResponseError {
  id: string;
  error: {
    status_code: number;
    message: string;
  };
}

export interface ExceptionsImportError {
  error: {
    status_code: number;
    message: string;
  };
  id?: string | undefined;
  list_id?: string | undefined;
  item_id?: string | undefined;
}

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  rules_count?: number;
  errors: Array<ImportRulesResponseError | ImportResponseError>;
  exceptions_success?: boolean;
  exceptions_success_count?: number;
  exceptions_errors?: ExceptionsImportError[];
  action_connectors_success?: boolean;
  action_connectors_success_count?: number;
  action_connectors_errors?: Array<ImportRulesResponseError | ImportResponseError>;
  action_connectors_warnings?: WarningSchema[];
}

export interface ExportDocumentsProps {
  ids: string[];
  filename?: string;
  excludeExportDetails?: boolean;
  signal?: AbortSignal;
}

export interface PrePackagedRulesStatusResponse {
  rules_custom_installed: number;
  rules_installed: number;
  rules_not_installed: number;
  rules_not_updated: number;
  timelines_installed: number;
  timelines_not_installed: number;
  timelines_not_updated: number;
}

export interface FindRulesReferencedByExceptionsListProp {
  id?: string;
  listId?: string;
  namespaceType: NamespaceType;
}

export interface FindRulesReferencedByExceptionsProps {
  lists: FindRulesReferencedByExceptionsListProp[];
  signal?: AbortSignal;
}

export enum RuleCustomizationEnum {
  customized = 'CUSTOMIZED',
  not_customized = 'NOT_CUSTOMIZED',
}
