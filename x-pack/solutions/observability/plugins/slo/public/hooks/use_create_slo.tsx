/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { QueryKey } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { encode } from '@kbn/rison';
import {
  ALL_VALUE,
  type CreateSLOInput,
  type CreateSLOResponse,
  type FindSLOResponse,
} from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { sloKeys } from './query_key_factory';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateSlo() {
  const {
    i18n: i18nStart,
    theme,
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    ServerError,
    { slo: CreateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['createSlo'],
    ({ slo }) => {
      return sloClient.fetch(`POST /api/observability/slos 2023-10-31`, { params: { body: slo } });
    },
    {
      onSuccess: (data, { slo }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        const sloEditUrl = http.basePath.prepend(paths.sloEdit(data.id));
        const sloViewUrl = http.basePath.prepend(paths.sloDetails(data.id, ALL_VALUE));

        toasts.addSuccess(
          {
            title: toMountPoint(
              <FormattedMessage
                id="xpack.slo.create.successNotification"
                defaultMessage="Successfully created {name}. {editSLO} or {viewSLO}"
                values={{
                  name: slo.name,
                  editSLO: (
                    <EuiLink data-test-subj="o11yUseCreateSloEditSloLink" href={sloEditUrl}>
                      {i18n.translate('xpack.slo.useCreateSlo.editSLOLinkLabel', {
                        defaultMessage: 'Edit SLO',
                      })}
                    </EuiLink>
                  ),
                  viewSLO: (
                    <EuiLink data-test-subj="o11yUseCreateSloViewSloLink" href={sloViewUrl}>
                      {i18n.translate('xpack.slo.useCreateSlo.viewSLOLinkLabel', {
                        defaultMessage: 'View SLO',
                      })}
                    </EuiLink>
                  ),
                }}
              />,
              {
                i18n: i18nStart,
                theme,
              }
            ),
          },
          {
            toastLifeTimeMs: 30000,
          }
        );
      },
      onError: (error, { slo }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(http.basePath.prepend(paths.sloCreateWithEncodedForm(encode(slo))));
      },
    }
  );
}
