/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isWorkerEnableBlocked, type Worker } from '@kbn/alertzero-common';
import { FeatureSettingsLink } from './feature_settings_link';
import type { WorkerWarningReason } from './worker_warning_content';

/** Warning reasons for a Worker the user has no model for. */
export const getModelWarningReasons = (
  worker: Pick<Worker, 'id' | 'blockingReasons'>
): WorkerWarningReason[] =>
  isWorkerEnableBlocked(worker.blockingReasons)
    ? [
        {
          id: 'no_model',
          message: (
            <FormattedMessage
              id="xpack.alertzero.watches.settings.worker.blockingReason.noModel"
              defaultMessage="Some AI-powered steps in this Worker may not be configured. Check {featureSettingsLink}."
              values={{
                featureSettingsLink: (
                  <FeatureSettingsLink data-test-subj={`alertZeroWorkerNoModelLink-${worker.id}`} />
                ),
              }}
            />
          ),
        },
      ]
    : [];
