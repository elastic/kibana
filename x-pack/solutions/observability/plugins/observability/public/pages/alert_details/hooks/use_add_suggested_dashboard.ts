/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useUpdateRule } from '@kbn/response-ops-rule-form/src/common/hooks';
import { UpdateRuleBody } from '@kbn/response-ops-rule-form/src/common/apis';
import { Rule, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useState } from 'react';
import { DashboardMetadata } from '../components/related_dashboards/dashboard_tile';

export const useAddSuggestedDashboards = ({
  rule,
  onSuccessAddSuggestedDashboard,
}: {
  rule: Rule;
  onSuccessAddSuggestedDashboard: () => Promise<void>;
}) => {
  const {
    services: { http, notifications },
  } = useKibana();

  const [addingDashboardId, setAddingDashboardId] = useState<string>();

  const onError = useCallback(
    (error: IHttpFetchError<{ message: string }>) => {
      setAddingDashboardId(undefined);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.observability.alertDetails.addSuggestedDashboardError', {
          defaultMessage: 'Error adding suggested dashboard',
        }),
      });
    },
    [notifications.toasts]
  );

  const onSuccess = useCallback(async () => {
    if (!addingDashboardId)
      throw new Error('Adding dashboard id not defined, this should never occur');
    await onSuccessAddSuggestedDashboard();
    setAddingDashboardId(undefined);
    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.observability.alertDetails.addSuggestedDashboardSuccess.title', {
        defaultMessage: 'Added to linked dashboard',
      }),
      text: i18n.translate('xpack.observability.alertDetails.addSuggestedDashboardSuccess.text', {
        defaultMessage:
          'From now on, this dashboard will be linked to all alerts triggered by this rule',
      }),
    });
  }, [addingDashboardId, notifications.toasts, onSuccessAddSuggestedDashboard]);

  const { mutateAsync: updateRule } = useUpdateRule({ http, onError, onSuccess });

  const onClickAddSuggestedDashboard = useCallback(
    (d: DashboardMetadata) => {
      const updatedRule: UpdateRuleBody = {
        ...rule,
        artifacts: {
          ...(rule.artifacts || {}),
          dashboards: [...(rule.artifacts?.dashboards || []), { id: d.id }],
        },
      };
      updateRule({ id: rule.id, formData: updatedRule });
      setAddingDashboardId(d.id);
    },
    [rule, updateRule]
  );

  return { onClickAddSuggestedDashboard, addingDashboardId };
};
