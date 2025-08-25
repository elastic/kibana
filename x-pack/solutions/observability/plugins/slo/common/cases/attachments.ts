/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/common';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';

export function buildSloHistoryAttachment({
  label,
  pathAndQuery,
}: {
  label: string;
  pathAndQuery?: string;
}): CaseAttachmentWithoutOwner {
  return {
    type: AttachmentType.persistableState,
    persistableStateAttachmentTypeId: '.page',
    persistableStateAttachmentState: {
      type: 'slo_history',
      url: pathAndQuery
        ? {
            pathAndQuery,
            label,
            actionLabel: i18n.translate('xpack.slo.addToCase.caseAttachmentLabel', {
              defaultMessage: 'Go to SLO history',
            }),
            iconType: 'metricbeatApp',
          }
        : null,
    },
  };
}
