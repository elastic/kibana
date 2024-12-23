/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { LOGS_ONBOARDING_FEEDBACK_LINK } from '@kbn/observability-shared-plugin/common';
import { ObservabilityLogsExplorerStartServices } from '../../../types';
import { FEEDBACK_TOAST_LIFETIME_MS } from './constants';

export const createRequestFeedbackNotifier =
  (toasts: IToasts, startServices: ObservabilityLogsExplorerStartServices) => () => {
    toasts.addInfo(
      {
        title: i18n.translate('xpack.observabilityLogsExplorer.feedbackToast.title', {
          defaultMessage: 'Tell us what you think!',
        }),
        text: toMountPoint(
          <>
            <p>
              {i18n.translate('xpack.observabilityLogsExplorer.feedbackToast.text', {
                defaultMessage: 'Share with us your onboarding experience and help us improve it.',
              })}
            </p>

            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="observabilityLogsExplorerFeedbackToastButton"
                  href={LOGS_ONBOARDING_FEEDBACK_LINK}
                  size="s"
                  target="_blank"
                  color="primary"
                >
                  {i18n.translate('xpack.observabilityLogsExplorer.feedbackToast.buttonText', {
                    defaultMessage: 'Take a quick survey',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>,
          startServices
        ),
        iconType: 'editorComment',
      },
      {
        toastLifeTimeMs: FEEDBACK_TOAST_LIFETIME_MS,
      }
    );
  };
