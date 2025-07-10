/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { truncate } from 'lodash';
import type {
  BulkEditActionResults,
  BulkEditActionSummary,
  NormalizedRuleError,
  RuleDetailsInError,
} from '../../../../../../../common/api/detection_engine';
import type {
  BulkActionType,
  BulkEditActionResponse,
  BulkActionsDryRunErrCode,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { BulkActionTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import type { DryRunError } from '../../../logic/bulk_actions/dry_run';
import { internalRuleToAPIResponse } from '../../../logic/detection_rules_client/converters/internal_rule_to_api_response';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export type BulkActionError =
  | PromisePoolError<string>
  | PromisePoolError<RuleAlertType>
  | BulkOperationError;

export const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    bulkAction,
    isDryRun = false,
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: {
    bulkAction?: BulkActionType;
    isDryRun?: boolean;
    errors?: BulkActionError[];
    updated?: RuleAlertType[];
    created?: RuleAlertType[];
    deleted?: RuleAlertType[];
    skipped?: BulkActionSkipResult[];
  }
): IKibanaResponse<BulkEditActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkEditActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  // if response is for dry_run, empty lists of rules returned, as rules are not actually updated and stored within ES
  // thus, it's impossible to return reliably updated/duplicated/deleted rules
  const results: BulkEditActionResults = isDryRun
    ? {
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      }
    : {
        updated: updated.map((rule) => internalRuleToAPIResponse(rule)),
        created: created.map((rule) => internalRuleToAPIResponse(rule)),
        deleted: deleted.map((rule) => internalRuleToAPIResponse(rule)),
        skipped,
      };

  if (numFailed > 0) {
    let message = summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed';
    if (bulkAction === BulkActionTypeEnum.run) {
      message =
        summary.succeeded > 0
          ? 'Bulk manual rule run partially failed'
          : 'Bulk manual rule run failed';
    }
    return response.custom<BulkEditActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message,
        status_code: 500,
        attributes: {
          errors: normalizeErrorResponse(errors),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: BulkEditActionResponse = {
    success: true,
    rules_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const normalizeErrorResponse = (errors: BulkActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map<string, NormalizedRuleError>();

  errors.forEach((errorObj) => {
    let message: string;
    let statusCode: number = 500;
    let errorCode: BulkActionsDryRunErrCode | undefined;
    let rule: RuleDetailsInError;
    // transform different error types (PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkOperationError)
    // to one common used in NormalizedRuleError
    if ('rule' in errorObj) {
      rule = errorObj.rule;
      message = errorObj.message;
    } else {
      const { error, item } = errorObj;
      const transformedError =
        error instanceof Error
          ? transformError(error)
          : { message: String(error), statusCode: 500 };

      errorCode = (error as DryRunError)?.errorCode;
      message = transformedError.message;
      statusCode = transformedError.statusCode;
      // The promise pool item is either a rule ID string or a rule object. We have
      // string IDs when we fail to fetch rules. Rule objects come from other
      // situations when we found a rule but failed somewhere else.
      rule = typeof item === 'string' ? { id: item } : { id: item.id, name: item.name };
    }

    if (errorsMap.has(message)) {
      errorsMap.get(message)?.rules.push(rule);
    } else {
      errorsMap.set(message, {
        message: truncate(message, { length: MAX_ERROR_MESSAGE_LENGTH }),
        status_code: statusCode,
        err_code: errorCode,
        rules: [rule],
      });
    }
  });

  return Array.from(errorsMap, ([_, normalizedError]) => normalizedError);
};
