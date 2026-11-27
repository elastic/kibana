/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import type { DescriptionList } from '../../../../../../common/utility_types';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { AssetCriticalityBadge } from '../../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { RiskScoreLevel } from '../../../../../entity_analytics/components/severity/common';
import { HOST_RISK_LEVEL } from '../../../../../overview/components/host_overview/translations';
import { USER_RISK_LEVEL } from '../../../../../overview/components/user_overview/translations';
import { useWatchlistLookup } from '../../../../../entity_analytics/components/ai_security/hooks/use_watchlist_lookup';
import type {
  AgentContext,
  AgentIdentity,
  AgentPerson,
  AgentStoreContext,
  RelatedEntity,
} from '../../../../../entity_analytics/components/ai_security/types';
import { ExpandablePanel } from '../../../../shared/components/expandable_panel';
import { AlertCountInsight } from '../../../../document/main/components/alert_count_insight';
import { TruncatedBadgeList } from '../../../shared/components/entity_source_value';
import { EntityLink, useOpenRelatedEntity, type OpenRelatedEntity } from './entity_link';
import { formatPersonStatus, getPersonSignals } from './person_signals';
import { RelatedEntityCard } from './related_entity_card';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ASSET_CRITICALITY_LABEL,
  ATTRIBUTION_TITLE,
  HOST_LABEL,
  NO_SIGNED_IN_ACCOUNT,
  RUNS_AS_LABEL,
  RUNS_AS_ROOT,
  SHOW_IN_GRAPH,
  SIGNED_IN_AS_LABEL,
  WATCHLISTS_LABEL,
  WATCHLISTS_OVERFLOW_TITLE,
} from '../translations';

const HOST_ALERTS_QUERY_ID = 'aiAgentAttributionHostAlerts';

const RiskLevelValue = ({ severity }: { severity: RiskSeverity }) => (
  <EuiText size="xs">
    <RiskScoreLevel severity={severity} hideBackgroundColor />
  </EuiText>
);

const PersonName = ({ person, onOpen }: { person: AgentPerson; onOpen: OpenRelatedEntity }) => {
  const { primary, email } = person;
  if (!primary) return <>{email}</>;
  return <EntityLink row={primary} label={primary.fullName ?? email} onOpen={onOpen} />;
};

const OtherAccounts = ({
  people,
  onOpen,
}: {
  people: readonly AgentPerson[];
  onOpen: OpenRelatedEntity;
}) => (
  <EuiFlexItem>
    <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.otherAccounts}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.alsoUsed"
        defaultMessage="Also used {emails}"
        values={{
          emails: people.map((person, index) => (
            <React.Fragment key={person.email}>
              {index > 0 && ', '}
              {person.primary ? (
                <EntityLink row={person.primary} label={person.email} onOpen={onOpen} />
              ) : (
                person.email
              )}
            </React.Fragment>
          )),
        }}
      />
    </EuiText>
  </EuiFlexItem>
);

const PersonCard = ({
  people,
  signedInAs,
  rowFacts,
  sharedAccount,
  onOpen,
}: {
  people: readonly AgentPerson[];
  signedInAs?: string;
  rowFacts?: AgentStoreContext;
  sharedAccount?: React.ReactNode;
  onOpen: OpenRelatedEntity;
}) => {
  const watchlistLookup = useWatchlistLookup();
  const [current, ...others] = useMemo(
    () =>
      [...people].sort((a, b) => Number(b.email === signedInAs) - Number(a.email === signedInAs)),
    [people, signedInAs]
  );
  if (!current) {
    return (
      <RelatedEntityCard
        caption={SIGNED_IN_AS_LABEL}
        iconType={EntityIconByType[EntityType.user]}
        name={
          <EuiTextColor color="subdued" data-test-subj={AI_AGENT_TEST_IDS.noSignedInAccount}>
            {NO_SIGNED_IN_ACCOUNT}
          </EuiTextColor>
        }
        data-test-subj={AI_AGENT_TEST_IDS.person}
      />
    );
  }
  const signals = getPersonSignals(current, rowFacts);
  const watchlistNames = watchlistLookup(
    signals.flatMap((signal) => (signal.kind === 'watchlist' ? [signal.watchlistId] : []))
  ).map(({ name }) => name);
  const items: DescriptionList[] =
    watchlistNames.length > 0
      ? [
          {
            title: WATCHLISTS_LABEL,
            description: (
              <TruncatedBadgeList
                values={watchlistNames}
                overflowTooltipTitle={WATCHLISTS_OVERFLOW_TITLE}
                data-test-subj={AI_AGENT_TEST_IDS.personWatchlists}
              />
            ),
          },
        ]
      : [];

  return (
    <RelatedEntityCard
      caption={SIGNED_IN_AS_LABEL}
      iconType={EntityIconByType[EntityType.user]}
      name={<PersonName person={current} onOpen={onOpen} />}
      subtitle={current.primary?.fullName ? current.email : undefined}
      items={items}
      status={formatPersonStatus(signals)}
      data-test-subj={AI_AGENT_TEST_IDS.person}
    >
      {others.length > 0 && <OtherAccounts people={others} onOpen={onOpen} />}
      {sharedAccount}
    </RelatedEntityCard>
  );
};

const HostCard = ({
  context: { agent, host },
  identity,
  onOpen,
}: {
  context: AgentContext;
  identity: AgentIdentity;
  onOpen: OpenRelatedEntity;
}) => {
  const hostName = host?.hostName ?? host?.name ?? agent?.hostName;
  const criticality = host?.criticality ?? agent?.storeContext?.hostCriticality;
  const items: DescriptionList[] = [
    ...(criticality && criticality !== 'unassigned'
      ? [
          {
            title: ASSET_CRITICALITY_LABEL,
            description: <AssetCriticalityBadge criticalityLevel={criticality} textSize="xs" />,
          },
        ]
      : []),
    ...(host?.riskLevel
      ? [{ title: HOST_RISK_LEVEL, description: <RiskLevelValue severity={host.riskLevel} /> }]
      : []),
  ];
  return (
    <RelatedEntityCard
      caption={HOST_LABEL}
      iconType={EntityIconByType[EntityType.host]}
      name={
        host ? (
          <EntityLink row={host} label={hostName ?? host.entityId} onOpen={onOpen} />
        ) : (
          hostName ?? identity.hostId
        )
      }
      items={items}
      data-test-subj={AI_AGENT_TEST_IDS.host}
    >
      {hostName && (
        <AlertCountInsight
          identityFields={{ 'host.name': hostName }}
          entityType={EntityType.host}
          queryId={HOST_ALERTS_QUERY_ID}
          data-test-subj={AI_AGENT_TEST_IDS.hostAlerts}
        />
      )}
    </RelatedEntityCard>
  );
};

const RunsAsCard = ({
  runsAs,
  identity,
  onOpen,
}: {
  runsAs?: RelatedEntity;
  identity: AgentIdentity;
  onOpen: OpenRelatedEntity;
}) => {
  const userName = runsAs?.userName ?? identity.userName;
  return (
    <RelatedEntityCard
      caption={RUNS_AS_LABEL}
      iconType={EntityIconByType[EntityType.user]}
      name={runsAs ? <EntityLink row={runsAs} label={userName} onOpen={onOpen} /> : userName}
      items={
        runsAs?.riskLevel
          ? [
              {
                title: USER_RISK_LEVEL,
                description: <RiskLevelValue severity={runsAs.riskLevel} />,
              },
            ]
          : []
      }
      status={userName === 'root' ? [RUNS_AS_ROOT] : []}
      data-test-subj={AI_AGENT_TEST_IDS.runsAs}
    />
  );
};

export interface AttributionSectionProps {
  readonly context: AgentContext;
  readonly identity: AgentIdentity;
  readonly scopeId: string;
  /** Opens and scrolls to the related agents section. */
  readonly onShowRelatedAgents: () => void;
  /** Opens the Graph tab. */
  readonly onShowGraph: () => void;
}

/**
 * Who is behind the agent and where it runs, with the AI security table's labels and order: the
 * signed-in person, the host and the OS user. Each is a card like the alert flyout's entity
 * blocks, and every name opens that entity's flyout. The title opens the Graph tab.
 */
export const AttributionSection = memo(
  ({ context, identity, scopeId, onShowRelatedAgents, onShowGraph }: AttributionSectionProps) => {
    const onOpen = useOpenRelatedEntity(scopeId);
    const { agent, runsAs, people, signedInAs, otherInstallsOnAccount } = context;
    // The row's person facts are a union over every person, so they only stand in for one person.
    const rowFacts = people.length === 1 ? agent?.storeContext : undefined;
    const link = useMemo(() => ({ callback: onShowGraph, tooltip: SHOW_IN_GRAPH }), [onShowGraph]);

    return (
      <ExpandablePanel
        header={{ title: ATTRIBUTION_TITLE, link }}
        data-test-subj={AI_AGENT_TEST_IDS.attribution}
      >
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <PersonCard
              people={people}
              signedInAs={signedInAs}
              rowFacts={rowFacts}
              sharedAccount={
                otherInstallsOnAccount.length > 0 && (
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="users" size="s" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <EuiLink
                            onClick={onShowRelatedAgents}
                            data-test-subj={AI_AGENT_TEST_IDS.sharedAccountLink}
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.sharedAccount"
                              defaultMessage="Account also signed in on {count, plural, one {# other install} other {# other installs}}"
                              values={{ count: otherInstallsOnAccount.length }}
                            />
                          </EuiLink>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )
              }
              onOpen={onOpen}
            />
          </EuiFlexItem>
          <EuiHorizontalRule margin="none" />
          <EuiFlexItem>
            <HostCard context={context} identity={identity} onOpen={onOpen} />
          </EuiFlexItem>
          <EuiHorizontalRule margin="none" />
          <EuiFlexItem>
            <RunsAsCard runsAs={runsAs} identity={identity} onOpen={onOpen} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
    );
  }
);
AttributionSection.displayName = 'AttributionSection';
