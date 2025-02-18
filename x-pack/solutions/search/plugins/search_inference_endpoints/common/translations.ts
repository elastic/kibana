/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFERENCE_ENDPOINT_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpointsLabel',
  {
    defaultMessage: 'Inference endpoints',
  }
);

export const CANCEL = i18n.translate('xpack.searchInferenceEndpoints.cancel', {
  defaultMessage: 'Cancel',
});

export const MANAGE_INFERENCE_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
  {
    defaultMessage:
      'Inference endpoints streamline the deployment and management of machine\nlearning models in Elasticsearch. Set up and manage NLP tasks using unique\nendpoints, to build AI-powered search.',
  }
);

export const VIEW_YOUR_MODELS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.viewYourModels',
  {
    defaultMessage: 'ML Trained Models',
  }
);

export const API_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.apiDocumentationLink',
  {
    defaultMessage: 'API Documentation',
  }
);

export const ADD_ENDPOINT_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.addConnectorButtonLabel',
  {
    defaultMessage: 'Add endpoint',
  }
);

export const ERROR_TITLE = i18n.translate('xpack.searchInferenceEndpoints.inferenceId.errorTitle', {
  defaultMessage: 'Error adding inference endpoint',
});

export const UNABLE_TO_CREATE_INFERENCE_ENDPOINT = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.unableTocreateInferenceEndpointError',
  {
    defaultMessage: 'Unable to create an inference endpoint.',
  }
);

export const INFERENCE_ENDPOINT_ALREADY_EXISTS = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.inferenceEndpointAlreadyExistsError',
  {
    defaultMessage: 'Inference Endpoint id already exists',
  }
);

export const FORBIDDEN_TO_ACCESS_TRAINED_MODELS = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.forbiddenToAccessTrainedModelsError',
  {
    defaultMessage: 'Forbidden to access trained models',
  }
);

export const ENDPOINT_ADDED_SUCCESS = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.endpointAddedSuccess',
  {
    defaultMessage: 'Endpoint added',
  }
);

export const ENDPOINT_CREATION_FAILED = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.endpointAddedFailure',
  {
    defaultMessage: 'Endpoint creation failed',
  }
);

export const ENDPOINT_ADDED_SUCCESS_DESCRIPTION = (endpointId: string) =>
  i18n.translate('xpack.searchInferenceEndpoints.actions.endpointAddedSuccessDescription', {
    defaultMessage: 'The inference endpoint "{endpointId}" was added.',
    values: { endpointId },
  });

export const ENDPOINT = i18n.translate('xpack.searchInferenceEndpoints.endpoint', {
  defaultMessage: 'Endpoint',
});

export const SERVICE_PROVIDER = i18n.translate('xpack.searchInferenceEndpoints.serviceProvider', {
  defaultMessage: 'Service',
});

export const TASK_TYPE = i18n.translate('xpack.searchInferenceEndpoints.taskType', {
  defaultMessage: 'Type',
});

export const TRAINED_MODELS_STAT_GATHER_FAILED = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.trainedModelsStatGatherFailed',
  {
    defaultMessage: 'Failed to retrieve trained model statistics',
  }
);

export const BREADCRUMB_RELEVANCE = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.relevance',
  {
    defaultMessage: 'Relevance',
  }
);

export const BREADCRUMB_INFERENCE_ENDPOINTS = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.inferenceEndpoints',
  {
    defaultMessage: 'Inference Endpoints',
  }
);

export const ENDPOINT_COPY_SUCCESS = (inferenceId: string) =>
  i18n.translate('xpack.searchInferenceEndpoints.actions.copyIDSuccess', {
    defaultMessage: 'Inference endpoint ID {inferenceId} copied',
    values: { inferenceId },
  });

export const ENDPOINT_COPY_ID_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.copyID',
  {
    defaultMessage: 'Copy endpoint ID',
  }
);

export const ENDPOINT_DELETE_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.deleteEndpoint',
  {
    defaultMessage: 'Delete endpoint',
  }
);

export const ENDPOINT_VIEW_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.viewEndpooint',
  {
    defaultMessage: 'View endpoint',
  }
);
