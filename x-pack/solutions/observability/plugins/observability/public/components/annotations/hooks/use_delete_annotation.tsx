/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { QueryKey, useMutation } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { Annotation } from '../../../../common/annotations';
import { useKibana } from '../../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteAnnotation() {
  const {
    i18n: i18nStart,
    theme,
    http,
    notifications: { toasts },
  } = useKibana().services;
  const services = useKibana().services;

  return useMutation<void, ServerError, { annotations: Annotation[] }, { queryKey?: QueryKey }>(
    ['deleteAnnotation'],
    async ({ annotations }) => {
      for (const annotation of annotations) {
        await http.delete(`/api/observability/annotation/${annotation.id}`);
      }
      return Promise.resolve();
    },
    {
      onSuccess: (data, { annotations }) => {
        toasts.addSuccess({
          title: toMountPoint(
            <RedirectAppLinks coreStart={services} data-test-subj="observabilityMainContainer">
              <FormattedMessage
                id="xpack.observability.annotation.delete.successNotification"
                defaultMessage="Successfully deleted annotations {name}."
                values={{
                  name: annotations.map((annotation) => annotation.message).join(', '),
                }}
              />
            </RedirectAppLinks>,
            {
              i18n: i18nStart,
              theme,
            }
          ),
        });
      },
      onError: (error, { annotations }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.observability.delete.annotation', {
            defaultMessage: 'Something went wrong while deleting annotation {message}',
            values: {
              message: annotations
                .map((annotation) => annotation.annotation?.title ?? annotation.message)
                .join(', '),
            },
          }),
        });
      },
    }
  );
}
