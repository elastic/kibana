/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseUpdateRuleVars, useUpdateRule } from '@kbn/response-ops-rule-form/src/common/hooks';
import { UpdateRuleBody } from '@kbn/response-ops-rule-form/src/common/apis';
import { Rule, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DashboardMetadata } from '../components/related_dashboards/dashboard';

export const useAddSuggestedDashboards = ({
  rule,
  onAddSuggestedDashboard,
  onFailAddSuggestedDashboard,
}: {
  rule: Rule;
  onAddSuggestedDashboard: (d: DashboardMetadata) => void;
  onFailAddSuggestedDashboard: (dashboardId: string) => void;
}) => {
  const {
    services: { http, notifications },
  } = useKibana();

  const onError = (error: IHttpFetchError<{ message: string }>, variables: UseUpdateRuleVars) => {
    // This function is returning the variables we set, so we're sure that there's at least one dashboard
    const addedDashboard = variables.formData.artifacts?.dashboards?.length
      ? variables.formData.artifacts?.dashboards[
          variables.formData.artifacts?.dashboards.length - 1
        ]
      : undefined;
    if (addedDashboard) {
      onFailAddSuggestedDashboard(addedDashboard.id);
    }
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.observability.alertDetails.addSuggestedDashboardError', {
        defaultMessage: 'Error adding suggested dashboard',
      }),
    });
  };

  const { mutateAsync: updateRule } = useUpdateRule({ http, onError });

  const onClickAddSuggestedDashboard = (d: DashboardMetadata) => {
    const updatedRule: UpdateRuleBody = {
      ...rule,
      artifacts: {
        ...(rule.artifacts || {}),
        dashboards: [...(rule.artifacts?.dashboards || []), { id: d.id }],
      },
    };
    updateRule({ id: rule.id, formData: updatedRule });
    onAddSuggestedDashboard(d);
  };

  return { onClickAddSuggestedDashboard };
};
