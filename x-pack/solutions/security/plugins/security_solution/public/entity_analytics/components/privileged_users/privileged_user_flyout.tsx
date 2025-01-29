/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiCodeBlock,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import React from 'react';

import type { Alert } from '@kbn/alerting-types';
import { KibanaServices } from '../../../common/lib/kibana/services';
import { EntityType } from '../../../../common/search_strategy';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type {
  PrivilegedUserDoc,
  PrivmonLoginDoc,
  PrivmonPrivilegeDoc,
} from '../../../../common/api/entity_analytics/privmon';
import { useRiskScore } from '../../api/hooks/use_risk_score';
import { FlyoutRiskSummary } from '../risk_summary_flyout/risk_summary';
import type { ESQuery } from '../../../../common/typed_json';
import { REQUEST_NAMES, useFetch } from '../../../common/hooks/use_fetch';
import { LoginsTable } from './logins_table';
import { PrivilegesTable } from './privileges_table';
import { AlertsTable } from './alerts_table';

const buildFilter = (userNames: string[]) => ({
  bool: {
    should: userNames.map((userName) => ({
      term: { 'user.name': userName },
    })),
    minimum_should_match: 1,
  },
});

const useMatchingUsers = (privilegedUser: PrivilegedUserDoc): PrivilegedUserDoc[] => {
  return [];
};

interface ResponseType {
  logins: PrivmonLoginDoc[];
  privileges: PrivmonPrivilegeDoc[];
  alerts: Alert[];
}

const fetchFlyoutData = ({ userNames }: { userNames: string[] }): Promise<ResponseType> => {
  return KibanaServices.get().http.fetch('/api/privileged_users_flyout', {
    prependBasePath: true,
    version: '2023-10-31',
    method: 'POST',
    body: JSON.stringify({
      userNames,
    }),
  });
};

export const PrivilegedUserFlyout: React.FC<{
  privilegedUser: PrivilegedUserDoc;
  closeFlyout: () => void;
}> = ({ privilegedUser, closeFlyout }) => {
  const [userQuery, setUserQuery] = React.useState<ESQuery>(
    buildFilter([privilegedUser.user.name])
  );

  const tabs = getTabs({ privilegedUser, setUserQuery, userQuery });

  return (
    <EuiFlyout onClose={closeFlyout}>
      <SummaryHeader privilegedUser={privilegedUser} />
      <EuiFlyoutBody>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const SummaryHeader: React.FC<{ privilegedUser: PrivilegedUserDoc }> = ({ privilegedUser }) => (
  <EuiFlyoutHeader>
    <EuiTitle size="m">
      <h2>{`Privileged user ${privilegedUser.user.name}`}</h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{'Created:'}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedRelativePreferenceDate value={privilegedUser.created_at} />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{'Updated:'}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedRelativePreferenceDate value={privilegedUser['@timestamp']} />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlyoutHeader>
);

const JsonViewer: React.FC<{
  privilegedUser: PrivilegedUserDoc;
}> = ({ privilegedUser }) => (
  <>
    <EuiSpacer size="m" />
    <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
      {JSON.stringify(privilegedUser, null, 2)}
    </EuiCodeBlock>
  </>
);

const Overview: React.FC<{
  privilegedUser: PrivilegedUserDoc;
  userQuery: ESQuery;
  setUserQuery: (query: ESQuery) => void;
}> = ({ privilegedUser, userQuery, setUserQuery }) => {
  const matchingUsers = useMatchingUsers(privilegedUser);
  const {
    data = { logins: [], privileges: [], alerts: [] },
    // fetch,
    isLoading,
  } = useFetch<{ userNames: string[] }, ResponseType, undefined>(
    REQUEST_NAMES.PRIVILEGED_USER_FLYOUT_DATA,
    fetchFlyoutData,
    {
      initialParameters: {
        userNames: [privilegedUser.user.name].concat(matchingUsers.map(({ user }) => user.name)),
      },
    }
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery: userQuery,
    onlyLatest: false,
    pagination: {
      cursorStart: 0,
      querySize: 1,
    },
  });

  return (
    <>
      <EuiSpacer size="m" />
      <FlyoutRiskSummary
        riskScoreData={riskScoreState}
        queryId={'hello'}
        recalculatingScore={false}
        isLinkEnabled={false}
        entityType={EntityType.user}
        openDetailsPanel={() => {}}
      />
      <>
        <EuiSpacer size="m" />
        <LoginsTable data={data.logins ?? []} isLoading={isLoading} />
        <EuiSpacer size="m" />
        <PrivilegesTable data={data.privileges ?? []} isLoading={isLoading} />
        <EuiSpacer size="m" />
        <AlertsTable alerts={data.alerts ?? []} isLoading={isLoading} />
      </>
    </>
  );
};

const getTabs = ({
  privilegedUser,
  setUserQuery,
  userQuery,
}: {
  privilegedUser: PrivilegedUserDoc;
  setUserQuery: (query: ESQuery) => void;
  userQuery: ESQuery; // addUserQuery
}) => [
  {
    id: 'overview',
    name: 'Overview',
    content: (
      <Overview privilegedUser={privilegedUser} userQuery={userQuery} setUserQuery={setUserQuery} />
    ),
  },
  {
    id: 'json',
    name: 'JSON',
    content: JsonViewer({ privilegedUser }),
  },
  {
    id: 'related',
    name: 'Related Users',
    content: <>{'Pick related users table here'}</>,
  },
];
