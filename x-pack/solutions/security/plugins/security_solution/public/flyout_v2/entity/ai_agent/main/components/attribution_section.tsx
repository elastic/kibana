/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { AssetCriticalityBadge } from '../../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import {
  useWatchlistLookup,
  type WatchlistLookup,
} from '../../../../../entity_analytics/components/ai_security/hooks/use_watchlist_lookup';
import type {
  AgentContext,
  AgentIdentity,
  AgentPerson,
  AgentStoreContext,
  RelatedEntity,
} from '../../../../../entity_analytics/components/ai_security/types';
import { RiskLevelBadge } from '../../../shared/components/risk_level_badge';
import { EntityLink, useOpenRelatedEntity, type OpenRelatedEntity } from './entity_link';
import { getPersonSignals, type PersonSignal } from './person_signals';
import { WatchlistBadge } from './watchlist_badge';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ATTRIBUTION_TITLE,
  DEPROVISIONED,
  HOST_LABEL,
  MFA_OFF,
  NO_SIGNED_IN_ACCOUNT,
  RUNS_AS_LABEL,
  RUNS_AS_ROOT,
  SIGNED_IN_AS_LABEL,
  SUSPENDED,
  TERMINATED,
} from '../translations';

const signalKey = (signal: PersonSignal): string => {
  switch (signal.kind) {
    case 'watchlist':
      return `watchlist-${signal.watchlistId}`;
    case 'idp':
      return `idp-${signal.provider}`;
    default:
      return signal.kind;
  }
};

const SignalBadge = ({
  signal,
  watchlistLookup,
}: {
  signal: PersonSignal;
  watchlistLookup: WatchlistLookup;
}) => {
  switch (signal.kind) {
    case 'watchlist':
      return <WatchlistBadge watchlist={watchlistLookup([signal.watchlistId])[0]} />;
    case 'terminated':
      return (
        <EuiBadge color="danger">
          {signal.date ? (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.terminatedOn"
              defaultMessage="Terminated {date}"
              values={{
                date: (
                  <FormattedDate
                    value={signal.date}
                    year="numeric"
                    month="short"
                    day="numeric"
                    timeZone="UTC"
                  />
                ),
              }}
            />
          ) : (
            TERMINATED
          )}
        </EuiBadge>
      );
    case 'idp':
      return (
        <EuiBadge color="danger">
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.idpAccountState"
            defaultMessage="{provider}: {state}"
            values={{
              provider: signal.provider,
              state: signal.state === 'deprovisioned' ? DEPROVISIONED : SUSPENDED,
            }}
          />
        </EuiBadge>
      );
    case 'mfa_off':
      return <EuiBadge color="danger">{MFA_OFF}</EuiBadge>;
  }
};

const PersonName = ({ person, onOpen }: { person: AgentPerson; onOpen: OpenRelatedEntity }) => {
  const { primary, email } = person;
  if (!primary) return <>{email}</>;
  return <EntityLink row={primary} label={primary.fullName ?? email} onOpen={onOpen} />;
};

const SignedInAs = ({
  people,
  signedInAs,
  rowFacts,
  onOpen,
}: {
  people: readonly AgentPerson[];
  signedInAs?: string;
  rowFacts?: AgentStoreContext;
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
      <EuiText size="s" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.noSignedInAccount}>
        {NO_SIGNED_IN_ACCOUNT}
      </EuiText>
    );
  }
  const signals = getPersonSignals(current, rowFacts);
  return (
    <div data-test-subj={AI_AGENT_TEST_IDS.person}>
      <EuiText size="s">
        <strong>
          <PersonName person={current} onOpen={onOpen} />
        </strong>
      </EuiText>
      {current.primary?.fullName && (
        <EuiText size="xs" color="subdued">
          {current.email}
        </EuiText>
      )}
      {signals.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup
            gutterSize="xs"
            wrap
            responsive={false}
            data-test-subj={AI_AGENT_TEST_IDS.personSignals}
          >
            {signals.map((signal) => (
              <EuiFlexItem grow={false} key={signalKey(signal)}>
                <SignalBadge signal={signal} watchlistLookup={watchlistLookup} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {others.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.otherAccounts}>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.aiAgent.attribution.alsoUsed"
              defaultMessage="Also used {emails}"
              values={{
                emails: others.map((person, index) => (
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
        </>
      )}
    </div>
  );
};

const Item = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem grow={false}>{children}</EuiFlexItem>
);

const InlineRow = ({ children, testId }: { children: React.ReactNode; testId: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false} data-test-subj={testId}>
    {children}
  </EuiFlexGroup>
);

const HostRow = ({
  context: { agent, host },
  identity,
  onOpen,
}: {
  context: AgentContext;
  identity: AgentIdentity;
  onOpen: OpenRelatedEntity;
}) => {
  const criticality = host?.criticality ?? agent?.storeContext?.hostCriticality;
  return (
    <InlineRow testId={AI_AGENT_TEST_IDS.host}>
      <Item>
        <EuiText size="s">
          {host ? (
            <EntityLink
              row={host}
              label={host.hostName ?? host.name ?? host.entityId}
              onOpen={onOpen}
            />
          ) : (
            agent?.hostName ?? identity.hostId
          )}
        </EuiText>
      </Item>
      {criticality && criticality !== 'unassigned' && (
        <Item>
          <AssetCriticalityBadge criticalityLevel={criticality} textSize="xs" />
        </Item>
      )}
      {host?.riskLevel && (
        <Item>
          <RiskLevelBadge riskLevel={host.riskLevel} />
        </Item>
      )}
    </InlineRow>
  );
};

const RunsAsRow = ({
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
    <InlineRow testId={AI_AGENT_TEST_IDS.runsAs}>
      <Item>
        <EuiText size="s">
          {runsAs ? <EntityLink row={runsAs} label={userName} onOpen={onOpen} /> : userName}
        </EuiText>
      </Item>
      {runsAs?.riskLevel && (
        <Item>
          <RiskLevelBadge riskLevel={runsAs.riskLevel} />
        </Item>
      )}
      {userName === 'root' && (
        <Item>
          <EuiBadge color="danger">{RUNS_AS_ROOT}</EuiBadge>
        </Item>
      )}
    </InlineRow>
  );
};

export interface AttributionSectionProps {
  readonly context: AgentContext;
  readonly identity: AgentIdentity;
  readonly scopeId: string;
  /** Opens and scrolls to the related agents section. */
  readonly onShowRelatedAgents: () => void;
}

/**
 * Who is behind the agent and where it runs, with the AI security table's labels and order:
 * the signed-in person (only abnormal signals as badges), the host and the OS user. Every name
 * opens that entity's flyout.
 */
export const AttributionSection = memo(
  ({ context, identity, scopeId, onShowRelatedAgents }: AttributionSectionProps) => {
    const onOpen = useOpenRelatedEntity(scopeId);
    const { agent, runsAs, people, signedInAs, otherInstallsOnAccount } = context;
    // The row's person facts are a union over every person, so they only stand in for one person.
    const rowFacts = people.length === 1 ? agent?.storeContext : undefined;

    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj={AI_AGENT_TEST_IDS.attribution}>
        <EuiTitle size="xs">
          <h3>{ATTRIBUTION_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 3]}
          rowGutterSize="m"
          listItems={[
            {
              title: SIGNED_IN_AS_LABEL,
              description: (
                <SignedInAs
                  people={people}
                  signedInAs={signedInAs}
                  rowFacts={rowFacts}
                  onOpen={onOpen}
                />
              ),
            },
            {
              title: HOST_LABEL,
              description: <HostRow context={context} identity={identity} onOpen={onOpen} />,
            },
            {
              title: RUNS_AS_LABEL,
              description: <RunsAsRow runsAs={runsAs} identity={identity} onOpen={onOpen} />,
            },
          ]}
        />
        {otherInstallsOnAccount.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" color="warning" size="s" aria-hidden={true} />
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
          </>
        )}
      </EuiPanel>
    );
  }
);
AttributionSection.displayName = 'AttributionSection';
