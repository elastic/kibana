/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import type { Ecs } from '@kbn/cases-plugin/common';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_NAME, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { ResponseActionsEmptyPrompt as ResponseActionsPrivilegeRequiredCallout } from '../../../../../common/components/response_actions/response_actions_empty_prompt';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import {
  RESPONSE_ACTIONS_VIEW_WRAPPER_TEST_ID,
  RESPONSE_NO_DATA_TEST_ID,
} from '../components/test_ids';
import type { ResponseActionTypesEnum } from '../../../../../../common/types/response_actions';
import { ResponseActionsResults } from '../../../../../common/components/response_actions/response_actions_results';
import { expandDottedObject } from '../../../../../../common/utils/expand_dotted';
import { useGetAutomatedActionList } from '../../../../../management/hooks/response_actions/use_get_automated_action_list';

const tabContentWrapperCss = css`
  height: 100%;
  position: relative;
`;

const emptyResponseActionsCss = css`
  display: inline-block;
  line-height: 1.7em;
`;

const EmptyResponseActions = () => {
  return (
    <div css={emptyResponseActionsCss} data-test-subj={RESPONSE_NO_DATA_TEST_ID}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.response.noDataDescription"
        defaultMessage="There are no response actions defined for this event. To add some, edit the rule's settings and set up {link}."
        values={{
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/rules-ui-create.html#rule-response-action"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.response.noDataLinkText"
                defaultMessage="response actions"
              />
            </EuiLink>
          ),
        }}
      />
    </div>
  );
};

interface RuleParametersWithResponseActions {
  response_actions?: Array<{
    action_type_id: ResponseActionTypesEnum;
    params?: Record<string, unknown>;
  }>;
}

export interface UseResponseActionsViewParams {
  /**
   * Alert document used to fetch and display response actions.
   */
  hit: DataTableRecord;
}

/**
 * Builds the Response actions view for a given alert document. Reads alert id and rule
 * parameters from `hit`, fetches automated action results, and returns the rendered
 * results, an empty state, or a privilege-required callout depending on user privileges
 * and whether the alert has any automated actions.
 */
export const useResponseActionsView = ({ hit }: UseResponseActionsViewParams): React.ReactNode => {
  const { canAccessEndpointActionsLogManagement } = useUserPrivileges().endpointPrivileges;

  const alertId = useMemo(() => hit.raw._id ?? (getFieldValue(hit, '_id') as string) ?? '', [hit]);
  const indexName = useMemo(
    () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
    [hit]
  );
  const responseActions = useMemo(
    () =>
      (getFieldValue(hit, ALERT_RULE_PARAMETERS) as RuleParametersWithResponseActions)
        ?.response_actions,
    [hit]
  );
  const ruleName = useMemo(() => getFieldValue(hit, ALERT_RULE_NAME) as string, [hit]);
  const ecsData = useMemo<Ecs>(
    () => ({
      ...(expandDottedObject(hit.flattened) as Ecs),
      _id: alertId,
      _index: indexName,
    }),
    [alertId, hit.flattened, indexName]
  );
  const hasAlertId = !!alertId;

  const [isLive, setIsLive] = useState(false);

  const { data: automatedList, isFetched } = useGetAutomatedActionList(
    {
      alertIds: alertId ? [alertId] : [],
    },
    // fetch action details if we have alert metadata and user has privileges
    { enabled: hasAlertId && canAccessEndpointActionsLogManagement, isLive }
  );

  const showResponseActions =
    canAccessEndpointActionsLogManagement && isFetched && !!automatedList?.items?.length;

  useEffect(() => {
    setIsLive(!!responseActions?.length && !automatedList?.items?.length);
  }, [automatedList?.items?.length, responseActions?.length]);

  if (!hasAlertId) {
    return <EmptyResponseActions />;
  }

  const automatedListItems = automatedList?.items ?? [];

  return (
    <>
      <EuiSpacer size="s" />
      <div css={tabContentWrapperCss} data-test-subj={RESPONSE_ACTIONS_VIEW_WRAPPER_TEST_ID}>
        {!canAccessEndpointActionsLogManagement ? (
          <ResponseActionsPrivilegeRequiredCallout type="endpoint" />
        ) : showResponseActions ? (
          <ResponseActionsResults
            actions={automatedListItems}
            ruleName={ruleName}
            ecsData={ecsData}
          />
        ) : (
          <EmptyResponseActions />
        )}
      </div>
    </>
  );
};
