/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComment, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useState, useMemo, memo } from 'react';
import { useGetActionDetails } from '../../../management/hooks/response_actions/use_get_action_details';
import type {
  LogsEndpointActionWithHosts,
  ActionDetails,
} from '../../../../common/endpoint/types/actions';
import { useUserPrivileges } from '../user_privileges';
import { useGetAutomatedActionResponseList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { ActionsLogExpandedTray } from '../../../management/components/endpoint_response_actions_list/components/action_log_expanded_tray';
import { ENDPOINT_COMMANDS } from './translations';
import { ResponseActionsEmptyPrompt } from './response_actions_empty_prompt';

interface EndpointResponseActionResultsProps {
  action: LogsEndpointActionWithHosts;
  ruleName?: string;
}

export const EndpointResponseActionResults = ({
  action,
  ruleName,
}: EndpointResponseActionResultsProps) => {
  const { agent } = action;
  const { action_id: actionId, expiration } = action.EndpointActions;
  const {
    endpointPrivileges: { canAccessEndpointActionsLogManagement },
  } = useUserPrivileges();

  const [isLive, setIsLive] = useState(true);
  const { data: expandedAction } = useGetAutomatedActionResponseList(
    { actionId, expiration, agent },
    { enabled: canAccessEndpointActionsLogManagement, action, isLive }
  );

  useEffect(() => {
    setIsLive(() => {
      if (!expandedAction) {
        return true;
      }
      return !expandedAction.errors?.length && expandedAction.status === 'pending';
    });
  }, [expandedAction]);

  const eventText = expandedAction ? getCommentText(expandedAction) : '';

  const hostName = useMemo(
    // we want to get the first and only hostname
    () => (expandedAction?.hosts ? Object.values(expandedAction.hosts)[0].name : ''),
    [expandedAction?.hosts]
  );

  return (
    <EuiComment
      username={ruleName}
      timestamp={<FormattedRelative value={action['@timestamp']} />}
      event={eventText}
      data-test-subj={'endpoint-results-comment'}
    >
      {canAccessEndpointActionsLogManagement ? (
        expandedAction ? (
          <ResponseActionDetailsWorkaround
            actionId={expandedAction.id}
            data-test-subj={`response-results-${hostName}`}
          />
        ) : (
          <EuiLoadingSpinner />
        )
      ) : (
        <ResponseActionsEmptyPrompt type="endpoint" />
      )}
    </EuiComment>
  );
};

const getCommentText = (action: ActionDetails): string => {
  if (action.errors?.length) {
    return ENDPOINT_COMMANDS.failed(action.command);
  }
  if (action.status === 'pending') {
    return ENDPOINT_COMMANDS.pending(action.command);
  }
  if (action.status === 'successful') {
    return ENDPOINT_COMMANDS.executed(action.command);
  }

  return ENDPOINT_COMMANDS.tried(action.command);
};

// Tech Debt - see team internal issue #9822
// This is a workaround to fix the issue where the action details record is missing critical fields.
// Because Automated Response Actions started to use the same component used in the action history log
// we need to ensure that the action details records is actually complete - thus we make an API call here
// to retrieve it.
// This should all be removed once issue 9822 is addressed and we have a single common `<ResponseActionDetails>`
// component that should be used everywhere.
const ResponseActionDetailsWorkaround = memo<{
  actionId: string;
  'data-test-subj'?: string;
}>(({ actionId, 'data-test-subj': dataTestSubj }) => {
  const { data: actionDetailsApiResult, isLoading } = useGetActionDetails(actionId);

  if (isLoading) {
    return <EuiLoadingSpinner />;
  }

  if (actionDetailsApiResult?.data) {
    return (
      <ActionsLogExpandedTray action={actionDetailsApiResult.data} data-test-subj={dataTestSubj} />
    );
  }

  return null;
});
ResponseActionDetailsWorkaround.displayName = 'ResponseActionDetailsWorkaround';
