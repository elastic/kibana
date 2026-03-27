/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { ALL_VALUE, type CreateCompositeSLOResponse } from '@kbn/slo-schema';
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useKibana } from '../../../hooks/use_kibana';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { sloKeys } from '../../../hooks/query_key_factory';
import type { CreateCompositeSLOForm } from '../types';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateCompositeSlo() {
  const {
    i18n: i18nStart,
    theme,
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();
  const queryClient = useQueryClient();

  return useMutation<
    CreateCompositeSLOResponse,
    ServerError,
    { compositeSlo: CreateCompositeSLOForm }
  >(
    ['createCompositeSlo'],
    ({ compositeSlo }) => {
      return sloClient.fetch('POST /api/observability/slo_composites 2023-10-31', {
        params: { body: toApiPayload(compositeSlo) },
      });
    },
    {
      onSuccess: (_data, { compositeSlo }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
        toasts.addSuccess({
          title: toMountPoint(
            <span>
              {i18n.translate('xpack.slo.compositeSloCreate.successNotification', {
                defaultMessage: 'Successfully created composite SLO "{name}"',
                values: { name: compositeSlo.name },
              })}
            </span>,
            { i18n: i18nStart, theme }
          ),
        });
      },
      onError: (error, { compositeSlo }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.compositeSloCreate.errorNotification', {
            defaultMessage: 'Failed to create composite SLO "{name}"',
            values: { name: compositeSlo.name },
          }),
        });
      },
    }
  );
}

function toApiPayload(form: CreateCompositeSLOForm) {
  return {
    name: form.name,
    description: form.description,
    members: form.members.map(({ sloId, instanceId, weight }) => ({
      sloId,
      ...(instanceId && instanceId !== ALL_VALUE ? { instanceId } : {}),
      weight,
    })),
    compositeMethod: 'weightedAverage' as const,
    timeWindow: form.timeWindow,
    budgetingMethod: 'occurrences' as const,
    objective: { target: form.objective.target / 100 },
    tags: form.tags,
  };
}
