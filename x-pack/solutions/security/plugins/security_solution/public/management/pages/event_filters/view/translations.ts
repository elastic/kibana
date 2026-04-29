/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { ArtifactFormComponentProps } from '../../../components/artifact_list_page';

export const getCreationSuccessMessage = (item: ArtifactFormComponentProps['item']) => {
  return i18n.translate('xpack.securitySolution.eventFilter.flyoutForm.creationSuccessToastTitle', {
    defaultMessage: '"{name}" has been added to the event filters list.',
    values: { name: item?.name },
  });
};

export const getCreationErrorMessage = (creationError: IHttpFetchError) => {
  return {
    title: i18n.translate('xpack.securitySolution.eventFilter.flyoutForm.creationErrorToastTitle', {
      defaultMessage: 'There was an error creating the new event filter.',
    }),
    message: { error: creationError.message },
  };
};

export const EVENT_FILTERS_PROCESS_DESCENDANT_DECORATOR_LABELS = {
  title: i18n.translate('xpack.securitySolution.eventFilter.processDescendantsIndicator.title', {
    defaultMessage: 'Filtering descendants of process',
  }),
  tooltipText: i18n.translate(
    'xpack.securitySolution.eventFilter.processDescendantsIndicator.tooltipText',
    {
      defaultMessage:
        'Filtering the descendants of a process means that events from the matched process are ingested, but events from its descendant processes are omitted.',
    }
  ),
  versionInfo: i18n.translate(
    'xpack.securitySolution.eventFilter.processDescendantsIndicator.versionInfo',
    {
      defaultMessage: 'Process descendant filtering works only with Agents v8.15+.',
    }
  ),
};
