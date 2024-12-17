/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';
import { assertUnreachable } from '../../../../../../common/utility_types';

/**
 * Transform the sort field name from the request to the Alerting framework
 * schema.
 *
 * It could be a bit confusing what field is used for sorting rules as it is
 * hidden under several layers of abstraction.
 *
 * Sort field as defined in the UI rule schema -> API transformation (this
 * function) -> Alerting framework transformation -> Saved Object Client
 * transformation -> Elasticsearch field
 *
 * The alerting framework applies the following transformations to the sort
 * field:
 * - Some sort fields like `name` are converted to `name.keyword` by the
 *   Alerting framework automatically
 * - Sort fields that have corresponding mapped params, like `riskScore`, will
 *   be prefixed with `mapped_params.` and converted to a snake case
 *   automatically. So `riskScore` will become `mapped_params.risk_score`
 * - Other fields will be passed to the saved object client as is.
 *
 * Saved objects client also applies some transformations to the sort field:
 * - First, it appends the saved object type to the sort field. So `name` will
 *   become `alert.name`
 * - If the sort field doesn't exist in saved object mappings, then it tries the
 *   field without prefixes, e.g., just `name`.
 *
 * @param sortField Sort field parameter from the request
 * @returns Sort field matching the Alerting framework schema
 */
export function transformSortField(sortField?: FindRulesSortField): string | undefined {
  if (!sortField) {
    return undefined;
  }

  switch (sortField) {
    // Without this conversion, rules will be sorted by the top-level SO fields.
    // That is seldom what is expected from sorting. After conversion, the
    // fields will be treated as `alert.updatedAt` and `alert.createdAt`
    case 'created_at':
      return 'createdAt';
    case 'updated_at':
      return 'updatedAt';

    // Convert front-end representation to the field names that match the Alerting framework mappings
    case 'execution_summary.last_execution.date':
      return 'monitoring.run.last_run.timestamp';
    case 'execution_summary.last_execution.metrics.execution_gap_duration_s':
      return 'monitoring.run.last_run.metrics.gap_duration_s';
    case 'execution_summary.last_execution.metrics.total_indexing_duration_ms':
      return 'monitoring.run.last_run.metrics.total_indexing_duration_ms';
    case 'execution_summary.last_execution.metrics.total_search_duration_ms':
      return 'monitoring.run.last_run.metrics.total_search_duration_ms';
    case 'execution_summary.last_execution.status':
      return 'lastRun.outcomeOrder';

    // Pass these fields as is. They will be converted to `alert.<field>` by the saved object client
    case 'createdAt':
    case 'updatedAt':
    case 'enabled':
    case 'name':
      return sortField;

    // Mapped fields will be converted to `mapped_params.risk_score` by the Alerting framework automatically
    case 'riskScore':
    case 'risk_score':
    case 'severity':
      return `params.${sortField}`;

    default:
      assertUnreachable(sortField);
  }
}
