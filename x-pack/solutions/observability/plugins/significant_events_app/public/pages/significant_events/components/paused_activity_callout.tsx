/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getPausedDetectionCalloutBody,
  getPausedDetectionCalloutTitle,
  type SignificantEventsMaintenanceStatus,
} from '@kbn/significant-events-plugin/common';

export function PausedActivityCallout({
  status,
  settingsHref,
}: {
  status: SignificantEventsMaintenanceStatus;
  settingsHref: string;
}) {
  return (
    <>
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        data-test-subj="significantEventsPausedBanner"
        title={getPausedDetectionCalloutTitle(status)}
        text={getPausedDetectionCalloutBody()}
        actionProps={{
          primary: {
            href: settingsHref,
            'data-test-subj': 'significantEventsPausedBannerSettingsLink',
            children: i18n.translate('xpack.significantEventsApp.pausedBannerSettingsButton', {
              defaultMessage: 'Open settings',
            }),
          },
        }}
      />
      <EuiSpacer />
    </>
  );
}
