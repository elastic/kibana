/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntAvailabilityFailure } from '../../../common/hunt_library';
import * as i18n from './translations';

/** Turns one machine-readable failure detail into the line the flyout shows. */
export const formatAvailabilityDetail = ({
  reason,
  detail,
}: {
  reason: HuntAvailabilityFailure['reason'];
  detail: string;
}): string => {
  if (reason === 'unavailable_mapping') {
    const separator = detail.indexOf(':');
    const kind = separator > 0 ? detail.slice(0, separator) : '';
    const field = separator > 0 ? detail.slice(separator + 1) : detail;
    switch (kind) {
      case 'missing':
        return i18n.detailMissingField(field);
      case 'conflict':
        return i18n.detailConflictField(field);
      case 'nested':
        return i18n.detailNestedField(field);
      case 'unsearchable':
        return i18n.detailUnsearchableField(field);
      default:
        return detail;
    }
  }
  return detail === 'worker_role_unreadable' ? i18n.DETAIL_ROLE_UNREADABLE : detail;
};
