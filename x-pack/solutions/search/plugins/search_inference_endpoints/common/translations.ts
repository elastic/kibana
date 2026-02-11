/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const EIS_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.eisDocumentationLink',
  {
    defaultMessage: 'Elastic Inference Service',
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

export const ENDPOINT = i18n.translate('xpack.searchInferenceEndpoints.endpoint', {
  defaultMessage: 'Endpoint',
});

export const MODEL = i18n.translate('xpack.searchInferenceEndpoints.model', {
  defaultMessage: 'Model',
});

export const SERVICE_PROVIDER = i18n.translate('xpack.searchInferenceEndpoints.serviceProvider', {
  defaultMessage: 'Service',
});

export const TASK_TYPE = i18n.translate('xpack.searchInferenceEndpoints.taskType', {
  defaultMessage: 'Type',
});

export const BREADCRUMB_RELEVANCE = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.relevance',
  {
    defaultMessage: 'Relevance',
  }
);

export const BREADCRUMB_INFERENCE_ENDPOINTS = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.inferenceEndpoints',
  {
    defaultMessage: 'Inference endpoints',
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

export const INFERENCE_ENDPOINTS_TABLE_CAPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.table.caption',
  {
    defaultMessage: 'Inference endpoints table',
  }
);
