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
  type FindSLOResponse,
  type UpdateSLOInput,
  type UpdateSLOResponse,
} from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { sloKeys } from './query_key_factory';
import { useKibana } from './use_kibana';
import { usePluginContext } from './use_plugin_context';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateSlo() {
  const {
    i18n: i18nStart,
    theme,
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const { sloClient } = usePluginContext();

  return useMutation<
    UpdateSLOResponse,
    ServerError,
    { sloId: string; slo: UpdateSLOInput },
    { previousData?: FindSLOResponse; queryKey?: QueryKey; sloId: string }
  >(
    ['updateSlo'],
    ({ sloId, slo }) => {
      return sloClient.fetch('PUT /api/observability/slos/{id} 2023-10-31', {
        params: { path: { id: sloId }, body: slo },
      });
    },
    {
      onSuccess: (data, { slo: { name } }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        const sloViewUrl = http.basePath.prepend(paths.sloDetails(data.id, ALL_VALUE));

        toasts.addSuccess(
          {
            title: toMountPoint(
              <FormattedMessage
                id="xpack.slo.update.successNotification"
                defaultMessage="Successfully updated {name}. {viewSLO}"
                values={{
                  name,
                  viewSLO: (
                    <EuiLink data-test-subj="o11yUseUpdateSloViewSloLink" href={sloViewUrl}>
                      {i18n.translate('xpack.slo.useUpdateSlo.viewSLOLinkLabel', {
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
      onError: (error, { slo, sloId }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name: slo.name },
          }),
        });

        navigateToUrl(http.basePath.prepend(paths.sloEditWithEncodedForm(sloId, encode(slo))));
      },
    }
  );
}
