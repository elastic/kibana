/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

import { MINIMUM_LICENSE_FOR_SUPPRESSION } from '../../../../../../common/detection_engine/constants';
import type { ConfigType } from '../../../../../config';
import type { BulkActionEditPayload } from '../../../../../../common/api/detection_engine/rule_management';

import { hasAlertSuppressionBulkEditAction } from './utils';

export const checkAlertSuppressionBulkEditSupport = async ({
  editActions,
  experimentalFeatures,
  licensing,
}: {
  editActions: BulkActionEditPayload[];
  experimentalFeatures: ConfigType['experimentalFeatures'];
  licensing: LicensingApiRequestHandlerContext;
}) => {
  const hasAlertSuppressionActions = hasAlertSuppressionBulkEditAction(editActions);
  const isAlertSuppressionEnabled = experimentalFeatures.bulkEditAlertSuppressionEnabled;

  if (hasAlertSuppressionActions) {
    if (!isAlertSuppressionEnabled) {
      return {
        body: `Bulk alert suppression actions are not supported. Use "experimentalFeatures.bulkEditAlertSuppressionEnabled" config field to enable it.`,
        statusCode: 400,
      };
    }

    const isAlertSuppressionLicenseValid = await licensing.license.hasAtLeast(
      MINIMUM_LICENSE_FOR_SUPPRESSION
    );
    if (!isAlertSuppressionLicenseValid) {
      return {
        body: `Alert suppression is enabled with ${MINIMUM_LICENSE_FOR_SUPPRESSION} license or above.`,
        statusCode: 403,
      };
    }
  }
  return undefined;
};
