/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import { KbnSuccessCallout } from '@kbn/ui-callout';

import type { TextExpansionCallOutState } from './text_expansion_callout';
import { fineTuneModelsActionProps } from './text_expansion_callout';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';

export const ModelDeployed = ({
  dismiss,
  ingestionMethod,
  isDismissable,
  isStartButtonDisabled,
}: Pick<
  TextExpansionCallOutState,
  'dismiss' | 'ingestionMethod' | 'isDismissable' | 'isStartButtonDisabled'
>) => {
  const { startTextExpansionModel } = useActions(TextExpansionCalloutLogic);

  return (
    <KbnSuccessCallout
      title={i18n.translate(
        'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedTitle',
        { defaultMessage: 'Your ELSER model has deployed but not started.' }
      )}
      text={i18n.translate(
        'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.deployedBody',
        {
          defaultMessage:
            'You may start the model in a single-threaded configuration for testing, or tune the performance for a production environment.',
        }
      )}
      actionProps={{
        primary: {
          children: i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.startModelButton.label',
            {
              defaultMessage: 'Start single-threaded',
            }
          ),
          'data-telemetry-id': `entSearchContent-${ingestionMethod}-pipelines-textExpansionCallOut-startModel`,
          disabled: isStartButtonDisabled,
          iconType: 'play',
          onClick: () => startTextExpansionModel(),
        },
        secondary: fineTuneModelsActionProps,
      }}
      onDismiss={isDismissable ? dismiss : undefined}
      dismissButtonProps={{ 'data-test-subj': 'enterpriseSearchTextExpansionDismissButtonButton' }}
    />
  );
};
