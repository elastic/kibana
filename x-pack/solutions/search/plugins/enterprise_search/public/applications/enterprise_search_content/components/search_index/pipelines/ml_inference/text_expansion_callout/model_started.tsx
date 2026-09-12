/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { KbnSuccessCallout } from '@kbn/ui-callout';

import { KibanaLogic } from '../../../../../../shared/kibana';

import { TRAINED_MODELS_PATH } from '../utils';

import type { TextExpansionCallOutState } from './text_expansion_callout';
import { fineTuneModelsActionProps } from './text_expansion_callout';

export const ModelStarted = ({
  dismiss,
  isCompact,
  isDismissable,
  isSingleThreaded,
}: Pick<
  TextExpansionCallOutState,
  'dismiss' | 'isCompact' | 'isDismissable' | 'isSingleThreaded'
>) => (
  <KbnSuccessCallout
    heading="h3"
    title={
      isSingleThreaded
        ? isCompact
          ? i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedSingleThreadedTitleCompact',
              { defaultMessage: 'Your ELSER model is running single-threaded.' }
            )
          : i18n.translate(
              'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedSingleThreadedTitle',
              { defaultMessage: 'Your ELSER model has started single-threaded.' }
            )
        : isCompact
        ? i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedTitleCompact',
            { defaultMessage: 'Your ELSER model is running.' }
          )
        : i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedTitle',
            { defaultMessage: 'Your ELSER model has started.' }
          )
    }
    text={
      !isCompact && (
        <p>
          {isSingleThreaded
            ? i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedSingleThreadedBody',
                {
                  defaultMessage:
                    'This single-threaded configuration is great for testing your custom inference pipelines, however performance should be fine-tuned for production.',
                }
              )
            : i18n.translate(
                'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.startedBody',
                {
                  defaultMessage: 'Enjoy the power of ELSER in your custom Inference pipeline.',
                }
              )}
        </p>
      )
    }
    actionProps={
      !isCompact
        ? {
            primary: isSingleThreaded
              ? fineTuneModelsActionProps
              : {
                  children: i18n.translate(
                    'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.viewModelsButton',
                    {
                      defaultMessage: 'View details',
                    }
                  ),
                  iconSide: 'left' as const,
                  iconType: 'wrench',
                  onClick: () =>
                    KibanaLogic.values.navigateToUrl(TRAINED_MODELS_PATH, {
                      shouldNotCreateHref: true,
                    }),
                },
          }
        : undefined
    }
    onDismiss={isDismissable ? dismiss : undefined}
    dismissButtonProps={{ 'data-test-subj': 'enterpriseSearchTextExpansionDismissButtonButton' }}
  />
);
