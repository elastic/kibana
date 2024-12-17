/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNumberOfSuppressedAlerts } from './get_number_of_suppressed_alerts';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import type { SuppressionFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';

import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';
describe('getNumberOfSuppressedAlerts', () => {
  it('should count total number of suppressed alerts in created alerts', () => {
    const createdAlerts = [
      { _id: '1', [ALERT_SUPPRESSION_DOCS_COUNT]: 2 },
      { _id: '2', [ALERT_SUPPRESSION_DOCS_COUNT]: 0 },
      { _id: '3', [ALERT_SUPPRESSION_DOCS_COUNT]: 4 },
      { _id: '4' },
    ] as Array<SuppressionFieldsLatest & BaseFieldsLatest & { _id: string }>;

    expect(getNumberOfSuppressedAlerts(createdAlerts, [])).toBe(6);
  });

  // each alert in suppressed alerts counts as +1, since it is also suppressed
  it('should count total number of suppressed alerts in suppressed alerts', () => {
    const suppressedAlerts = [
      { _id: '1', [ALERT_SUPPRESSION_DOCS_COUNT]: 2 },
      { _id: '2', [ALERT_SUPPRESSION_DOCS_COUNT]: 0 },
      { _id: '3', [ALERT_SUPPRESSION_DOCS_COUNT]: 4 },
    ] as Array<SuppressionFieldsLatest & BaseFieldsLatest & { _id: string }>;

    expect(getNumberOfSuppressedAlerts([], suppressedAlerts)).toBe(9);
  });

  it('should count total number of suppressed alerts', () => {
    const createdAlerts = [{ _id: '1', [ALERT_SUPPRESSION_DOCS_COUNT]: 2 }] as Array<
      SuppressionFieldsLatest & BaseFieldsLatest & { _id: string }
    >;
    const suppressedAlerts = [{ _id: '3', [ALERT_SUPPRESSION_DOCS_COUNT]: 4 }] as Array<
      SuppressionFieldsLatest & BaseFieldsLatest & { _id: string }
    >;
    expect(getNumberOfSuppressedAlerts(createdAlerts, suppressedAlerts)).toBe(7);
  });
});
