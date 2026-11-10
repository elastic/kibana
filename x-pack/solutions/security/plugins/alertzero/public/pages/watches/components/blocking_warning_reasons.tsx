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
import * as settingsI18n from '../settings_translations';

/**
 * Warning reasons for a Worker's `blockingReasons`; `no_model` is the only one so far. The header
 * icon is a tooltip, which can't hold a working link, so only interactive surfaces such as the
 * post-save notice get one.
 */
export const getBlockingWarningReasons = (
  worker: Pick<Worker, 'id' | 'blockingReasons'>,
  { withLink }: { withLink: boolean }
): WorkerWarningReason[] => {
  if (!isWorkerEnableBlocked(worker.blockingReasons)) {
    return [];
  }
  return [
    {
      id: 'no_model',
      message: withLink ? (
        <FormattedMessage
          id="xpack.alertzero.watches.settings.worker.blockingReason.noModel"
          defaultMessage="Some AI-powered steps in this Worker may not be configured. Check {featureSettingsLink}."
          values={{
            featureSettingsLink: (
              <FeatureSettingsLink data-test-subj={`alertZeroWorkerNoModelLink-${worker.id}`} />
            ),
          }}
        />
      ) : (
        settingsI18n.NO_MODEL_REASON_PLAIN
      ),
    },
  ];
};
