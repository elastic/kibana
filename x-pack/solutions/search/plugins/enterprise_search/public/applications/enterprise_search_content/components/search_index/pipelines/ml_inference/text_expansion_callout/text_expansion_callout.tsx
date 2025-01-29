/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../../shared/kibana';
import { IndexViewLogic } from '../../../index_view_logic';

import { TRAINED_MODELS_PATH } from '../utils';

import { DeployModel } from './deploy_model';
import { ModelDeployed } from './model_deployed';
import { ModelDeploymentInProgress } from './model_deployment_in_progress';
import { ModelStarted } from './model_started';
import { useTextExpansionCallOutData } from './text_expansion_callout_data';
import { TextExpansionCalloutLogic } from './text_expansion_callout_logic';
import { TextExpansionErrors } from './text_expansion_errors';

export interface TextExpansionCallOutState {
  dismiss: () => void;
  ingestionMethod: string;
  isCompact: boolean;
  isCreateButtonDisabled: boolean;
  isDismissable: boolean;
  isSingleThreaded: boolean;
  isStartButtonDisabled: boolean;
  show: boolean;
}

export interface TextExpansionCallOutProps {
  isCompact?: boolean;
  isDismissable?: boolean;
}

export const TextExpansionDismissButton = ({
  dismiss,
}: Pick<TextExpansionCallOutState, 'dismiss'>) => {
  return (
    <EuiButtonIcon
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.content.index.pipelines.textExpansionCallOut.dismissButton',
        { defaultMessage: 'Dismiss ELSER call out' }
      )}
      iconType="cross"
      onClick={dismiss}
    />
  );
};

export const FineTuneModelsButton: React.FC = () => (
  <EuiButtonEmpty
    iconSide="left"
    iconType="wrench"
    onClick={() =>
      KibanaLogic.values.navigateToUrl(TRAINED_MODELS_PATH, {
        shouldNotCreateHref: true,
      })
    }
  >
    {i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCallOut.fineTuneModelButton',
      {
        defaultMessage: 'Fine-tune performance',
      }
    )}
  </EuiButtonEmpty>
);

export const TextExpansionCallOut: React.FC<TextExpansionCallOutProps> = (props) => {
  const { dismiss, isCompact, isDismissable, show } = useTextExpansionCallOutData(props);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    isCreateButtonDisabled,
    isModelDownloadInProgress,
    isModelDownloaded,
    isModelRunningSingleThreaded,
    isModelStarted,
    textExpansionError,
    isStartButtonDisabled,
  } = useValues(TextExpansionCalloutLogic);

  if (textExpansionError) return <TextExpansionErrors error={textExpansionError} />;

  if (!show) return null;

  if (isModelDownloadInProgress) {
    return <ModelDeploymentInProgress dismiss={dismiss} isDismissable={isDismissable} />;
  } else if (isModelDownloaded) {
    return (
      <ModelDeployed
        dismiss={dismiss}
        ingestionMethod={ingestionMethod}
        isDismissable={isDismissable}
        isStartButtonDisabled={isStartButtonDisabled}
      />
    );
  } else if (isModelStarted) {
    return (
      <ModelStarted
        dismiss={dismiss}
        isCompact={isCompact}
        isDismissable={isDismissable}
        isSingleThreaded={isModelRunningSingleThreaded}
      />
    );
  }

  return (
    <DeployModel
      dismiss={dismiss}
      ingestionMethod={ingestionMethod}
      isDismissable={isDismissable}
      isCreateButtonDisabled={isCreateButtonDisabled}
    />
  );
};
