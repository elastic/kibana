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
  EuiButton,
  EuiBasicTable,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import memoize from 'lodash/memoize';
import { KibanaServices } from '../../../common/lib/kibana/services';
import { EntityType } from '../../../../common/search_strategy';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type {
  PrivilegedUserDoc,
  PrivilegedUserIdentityFields,
  PrivmonLoginDoc,
  PrivmonPrivilegeDoc,
} from '../../../../common/api/entity_analytics/privmon';
import { useRiskScore } from '../../api/hooks/use_risk_score';
import { FlyoutRiskSummary } from '../risk_summary_flyout/risk_summary';
import { REQUEST_NAMES, useFetch } from '../../../common/hooks/use_fetch';
import { LoginsTable } from './logins_table';
import { PrivilegesTable } from './privileges_table';
import { AlertsTable } from './alerts_table';

const buildFilter = (users: PrivilegedUserDoc[]) => ({
  bool: {
    should: users.map((user) => ({
      term: { 'user.name': user.user.name },
    })),
    minimum_should_match: 1,
  },
});

interface SimilarUsersResponseType {
  users: PrivilegedUserDoc[];
}

const usersMatch = (a: PrivilegedUserDoc, b: PrivilegedUserDoc) =>
  a.user.name === b.user.name && a.user.id === b.user.id;

const fetchSimilarUsers = (
  user: PrivilegedUserIdentityFields
): Promise<SimilarUsersResponseType> => {
  return KibanaServices.get().http.fetch('/api/privmon/similar_users', {
    prependBasePath: true,
    version: '2023-10-31',
    method: 'POST',
    body: JSON.stringify(user),
  });
};

const useSimilarUsers = (user: PrivilegedUserIdentityFields) => {
  return useFetch<PrivilegedUserIdentityFields, SimilarUsersResponseType, undefined>(
    REQUEST_NAMES.SIMILAR_USERS,
    fetchSimilarUsers,
    {
      initialParameters: user,
    }
  );
};

interface DataResponseType {
  logins: PrivmonLoginDoc[];
  privileges: PrivmonPrivilegeDoc[];
  alerts: Alert[];
}

const fetchFlyoutData = ({ userNames }: { userNames: string[] }): Promise<DataResponseType> => {
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
  const { data: similarUsersData } = useSimilarUsers(privilegedUser.user);

  const candidateLinkedUsers = similarUsersData?.users ?? [];

  const [linkedUsers, setLinkedUsers] = React.useState<PrivilegedUserDoc[]>([privilegedUser]);

  const addLinkedUser = (user: PrivilegedUserDoc) => {
    setLinkedUsers([...linkedUsers, user]);
  };

  const removeLinkedUser = (user: PrivilegedUserDoc) => {
    setLinkedUsers(linkedUsers.filter((u) => !usersMatch(u, user)));
  };

  const tabs = getTabs({
    privilegedUser,
    addLinkedUser,
    removeLinkedUser,
    linkedUsers,
    candidateLinkedUsers,
  });

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
  linkedUsers: PrivilegedUserDoc[];
}> = ({ privilegedUser, linkedUsers }) => {
  const { data = { logins: [], privileges: [], alerts: [] }, isLoading } = useFetch<
    { userNames: string[] },
    DataResponseType,
    undefined
  >(REQUEST_NAMES.PRIVILEGED_USER_FLYOUT_DATA, fetchFlyoutData, {
    initialParameters: {
      userNames: linkedUsers.map((u) => u.user.name),
    },
  });

  const filterQuery = useMemo(() => buildFilter(linkedUsers), [linkedUsers]);

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.user,
    filterQuery,
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

const HighLightedName = ({ name, matchedName }: { name: string; matchedName: string }) => {
  if (!name.includes(matchedName)) {
    return <EuiText>{name}</EuiText>;
  }

  return (
    <EuiText>
      {name.split(matchedName).map((part, index) => (
        <span key={index}>
          {index > 0 && <strong>{matchedName}</strong>}
          {part}
        </span>
      ))}
    </EuiText>
  );
};

const LinkUsersTable = ({
  candidateLinkedUsers,
  linkedUsers,
  addLinkedUser,
  removeLinkedUser,
  privilegedUser,
}: {
  candidateLinkedUsers: PrivilegedUserDoc[];
  linkedUsers: PrivilegedUserDoc[];
  addLinkedUser: (user: PrivilegedUserDoc) => void;
  removeLinkedUser: (user: PrivilegedUserDoc) => void;
  privilegedUser: PrivilegedUserDoc;
}) => {
  const rowsData = candidateLinkedUsers.map((user) => ({
    user,
    isLinked: linkedUsers.some((u) => usersMatch(u, user)),
  }));

  const columns = [
    {
      field: 'user.user.name',
      name: 'Name',
      render: (name: string) => (
        <HighLightedName name={name} matchedName={privilegedUser.user.name} />
      ),
    },
    {
      field: 'user.user.id',
      name: 'ID',
      render: (id: string) => <EuiText>{id}</EuiText>,
    },
    {
      field: 'isLinked',
      name: 'Linked',
      render: (isLinked: boolean, { user }: { user: PrivilegedUserDoc }) => (
        <EuiButton
          size="s"
          onClick={() => (isLinked ? removeLinkedUser(user) : addLinkedUser(user))}
        >
          {isLinked ? 'Remove' : 'Include'}
        </EuiButton>
      ),
    },
  ];

  return <EuiBasicTable columns={columns} items={rowsData} />;
};

const RelatedUsers: React.FC<{
  privilegedUser: PrivilegedUserDoc;
  linkedUsers: PrivilegedUserDoc[];
  candidateLinkedUsers: PrivilegedUserDoc[];
  addLinkedUser: (user: PrivilegedUserDoc) => void;
  removeLinkedUser: (user: PrivilegedUserDoc) => void;
}> = ({ linkedUsers, addLinkedUser, removeLinkedUser, candidateLinkedUsers, privilegedUser }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText>
        <h3>{'Related Users'}</h3>
      </EuiText>
      <EuiSpacer size="m" />
      <LinkUsersTable
        privilegedUser={privilegedUser}
        candidateLinkedUsers={candidateLinkedUsers}
        linkedUsers={linkedUsers}
        addLinkedUser={addLinkedUser}
        removeLinkedUser={removeLinkedUser}
      />
    </>
  );
};

const getTabs = memoize(
  ({
    privilegedUser,
    linkedUsers,
    candidateLinkedUsers,
    addLinkedUser,
    removeLinkedUser,
  }: {
    privilegedUser: PrivilegedUserDoc;
    linkedUsers: PrivilegedUserDoc[];
    candidateLinkedUsers: PrivilegedUserDoc[];
    addLinkedUser: (user: PrivilegedUserDoc) => void;
    removeLinkedUser: (user: PrivilegedUserDoc) => void;
  }) => [
    {
      id: 'overview',
      name: 'Overview',
      content: <Overview privilegedUser={privilegedUser} linkedUsers={linkedUsers} />,
    },
    {
      id: 'json',
      name: 'JSON',
      content: JsonViewer({ privilegedUser }),
    },
    {
      id: 'related',
      name: 'Related Users',
      content: (
        <RelatedUsers
          {...{
            linkedUsers,
            addLinkedUser,
            removeLinkedUser,
            candidateLinkedUsers,
            privilegedUser,
          }}
        />
      ),
    },
  ]
);
