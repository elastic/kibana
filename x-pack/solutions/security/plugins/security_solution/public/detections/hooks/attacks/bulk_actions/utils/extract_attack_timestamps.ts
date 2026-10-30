/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/securitysolution-timeline-common';
import { TIMESTAMP } from '@kbn/rule-data-utils';

/** Reads the attack timestamps carried on the synthesised Timeline items. */
export const extractAttackTimestamps = (alertItems: TimelineItem[]): Array<string | undefined> =>
  alertItems.map((item) => {
    const fieldData = item.data.find((data) => data.field === TIMESTAMP);

    return fieldData?.value?.[0];
  });
