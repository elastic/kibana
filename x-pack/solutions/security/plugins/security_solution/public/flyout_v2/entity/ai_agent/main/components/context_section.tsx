/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { AssetCriticalityBadge } from '../../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import {
  useWatchlistLookup,
  type WatchlistLookup,
} from '../../../../../entity_analytics/components/ai_agents/hooks/use_watchlist_lookup';
import { RiskLevelBadge } from '../../../shared/components/risk_level_badge';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../use_flyout_api';
import type {
  AgentContext,
  AgentPerson,
  AgentStoreContext,
  IdpAccount,
  RelatedEntity,
} from '../../../../../entity_analytics/components/ai_agents/types';
import { getAgentDisplayName } from '../../../../../entity_analytics/components/ai_agents/utils';
import { GAP_IDS } from '../../../../../entity_analytics/components/ai_agents/gaps';
import { GapLink } from './missing_layer_note';
import { GeneratedDataBadge } from './generated_data_badge';
import { StoreContextPanel } from './store_context_panel';
import { WatchlistBadges } from './watchlist_badges';
import { AI_AGENT_TEST_IDS } from '../test_ids';
import {
  ACTS_FOR_NONE,
  ACTS_FOR_TITLE,
  CRITICALITY_LABEL,
  DEPROVISIONED,
  ENABLED,
  HOST_NOT_FOUND,
  HOST_TITLE,
  HR_LABEL,
  IDP_STATUS_LABEL,
  IDP_UNKNOWN,
  LAST_SIGNED_IN,
  MFA_LABEL,
  MFA_OFF,
  MFA_ON,
  OTHER_AGENTS_ON_HOST,
  OTHER_INSTALLS_NONE,
  OTHER_INSTALLS_TITLE,
  PERSON_NOT_FOUND,
  PREVIOUS_ACCOUNT,
  RISK_LABEL,
  RUNS_AS_NOT_FOUND,
  RUNS_AS_ROOT,
  RUNS_AS_TITLE,
  SUSPENDED,
  WATCHLISTS_LABEL,
} from '../translations';
import { NO_SCORE_YET } from '../../../../../entity_analytics/components/ai_agents/translations';

type OpenEntity = (row: RelatedEntity) => void;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <>
    <EuiTitle size="xxs">
      <h3>{children}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
  </>
);

const RiskValue = ({ row }: { row?: Pick<RelatedEntity, 'riskLevel'> }) =>
  row?.riskLevel ? (
    <RiskLevelBadge riskLevel={row.riskLevel} />
  ) : (
    <EuiText size="xs">{NO_SCORE_YET}</EuiText>
  );

const EntityLink = ({
  row,
  label,
  onOpen,
}: {
  row: RelatedEntity;
  label: string;
  onOpen: OpenEntity;
}) => <EuiLink onClick={() => onOpen(row)}>{label}</EuiLink>;

const isTerminated = (status: string | undefined): boolean =>
  status?.toLowerCase() === 'terminated';

const idpStatusText = (account: IdpAccount): string => {
  if (account.deprovisioned) return DEPROVISIONED;
  if (account.suspended) return SUSPENDED;
  if (account.status) return account.status;
  return account.enabled ? ENABLED : IDP_UNKNOWN;
};

/** Relative time stays short in a badge; the tooltip has the full date. */
const ALWAYS_RELATIVE_HOURS = 24 * 365;

interface MfaState {
  readonly enabled?: boolean;
  /** An IdP document behind the value is tagged `poc-mock`. */
  readonly isMock: boolean;
}

const hasMockMfa = ({ idpAccounts }: AgentPerson): boolean =>
  idpAccounts.some((account) => account.mfaEnabled !== undefined && account.isMock);

/**
 * MFA for one person. The agent row's value comes first, when it speaks for this person alone.
 * Otherwise it is read from the IdP documents and the person's rows, and off wins when any
 * source reports off.
 */
const getMfaState = (person: AgentPerson, rowFacts?: AgentStoreContext): MfaState => {
  const isMock = hasMockMfa(person);
  if (rowFacts?.personMfaEnabled !== undefined) {
    return { enabled: rowFacts.personMfaEnabled, isMock };
  }
  const known = [
    ...person.idpAccounts.map((account) => account.mfaEnabled),
    ...person.rows.map((personRow) => personRow.mfaEnabled),
  ].filter((value): value is boolean => value !== undefined);
  return { enabled: known.length === 0 ? undefined : !known.includes(false), isMock };
};

const getPersonWatchlistIds = (
  person: AgentPerson,
  rowFacts?: AgentStoreContext
): readonly string[] => rowFacts?.personWatchlistIds ?? person.watchlistIds;

/** The row's `runs_as_root` comes first, then the OS user name. */
const isRunningAsRoot = ({ agent, runsAs }: AgentContext): boolean =>
  agent?.storeContext?.runsAsRoot ?? (agent?.userName ?? runsAs?.userName) === 'root';

const SignedInBadge = ({ isCurrent, signedInAt }: { isCurrent: boolean; signedInAt?: string }) => {
  if (!isCurrent) return <EuiBadge color="hollow">{PREVIOUS_ACCOUNT}</EuiBadge>;
  return (
    <EuiBadge color="primary">
      {signedInAt ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.aiAgent.context.lastSignedInAt"
          defaultMessage="Last signed in {time}"
          values={{
            time: (
              <FormattedRelativePreferenceDate
                value={signedInAt}
                relativeThresholdInHrs={ALWAYS_RELATIVE_HOURS}
              />
            ),
          }}
        />
      ) : (
        LAST_SIGNED_IN
      )}
    </EuiBadge>
  );
};

const PersonCard = memo(
  ({
    person,
    isCurrent,
    signedInAt,
    onOpen,
    watchlistLookup,
    rowFacts,
  }: {
    person: AgentPerson;
    isCurrent: boolean;
    signedInAt?: string;
    onOpen: OpenEntity;
    watchlistLookup: WatchlistLookup;
    /** The agent row's context, given only when it describes this person alone. */
    rowFacts?: AgentStoreContext;
  }) => {
    const { primary, idpAccounts, email } = person;
    const watchlists = watchlistLookup(getPersonWatchlistIds(person, rowFacts));
    const mfa = getMfaState(person, rowFacts);
    const isAtRisk =
      idpAccounts.some((account) => account.deprovisioned || account.suspended) ||
      isTerminated(person.hr?.status);
    return (
      <EuiPanel
        hasBorder
        paddingSize="s"
        color={isAtRisk ? 'danger' : 'plain'}
        data-test-subj={AI_AGENT_TEST_IDS.person}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                {primary ? (
                  <EntityLink row={primary} label={primary.fullName ?? email} onOpen={onOpen} />
                ) : (
                  email
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
          {primary?.fullName && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {email}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <SignedInBadge isCurrent={isCurrent} signedInAt={signedInAt} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        {!primary && (
          <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.personNotFound}>
            {PERSON_NOT_FOUND} <GapLink gapId={GAP_IDS.noIdpData} />
          </EuiText>
        )}
        <EuiDescriptionList
          compressed
          type="column"
          columnWidths={[1, 2]}
          listItems={[
            {
              title: IDP_STATUS_LABEL,
              description:
                idpAccounts.length === 0 ? (
                  IDP_UNKNOWN
                ) : (
                  <EuiFlexGroup
                    gutterSize="xs"
                    alignItems="center"
                    wrap
                    responsive={false}
                    data-test-subj={AI_AGENT_TEST_IDS.personIdp}
                  >
                    {idpAccounts.map((account) => (
                      <React.Fragment key={account.provider}>
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color={account.deprovisioned || account.suspended ? 'danger' : 'hollow'}
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.flyout.entityDetails.aiAgent.context.idpAccountStatus"
                              defaultMessage="{provider}: {status}"
                              values={{
                                provider: account.provider,
                                status: idpStatusText(account),
                              }}
                            />
                          </EuiBadge>
                        </EuiFlexItem>
                        {account.isMock && (
                          <EuiFlexItem grow={false}>
                            <GeneratedDataBadge />
                          </EuiFlexItem>
                        )}
                      </React.Fragment>
                    ))}
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <GapLink gapId={GAP_IDS.userRowsNoIdpStatus} />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
            },
            {
              title: MFA_LABEL,
              description: (
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  wrap
                  responsive={false}
                  data-test-subj={AI_AGENT_TEST_IDS.personMfa}
                >
                  <EuiFlexItem grow={false}>
                    {mfa.enabled === undefined ? (
                      <EuiText size="xs">{IDP_UNKNOWN}</EuiText>
                    ) : (
                      <EuiBadge color={mfa.enabled ? 'success' : 'danger'}>
                        {mfa.enabled ? MFA_ON : MFA_OFF}
                      </EuiBadge>
                    )}
                  </EuiFlexItem>
                  {mfa.isMock && (
                    <EuiFlexItem grow={false}>
                      <GeneratedDataBadge />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <GapLink gapId={GAP_IDS.noMfaState} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            },
            {
              title: HR_LABEL,
              description: person.hr?.status ? (
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  wrap
                  responsive={false}
                  data-test-subj={AI_AGENT_TEST_IDS.personHr}
                >
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={isTerminated(person.hr.status) ? 'danger' : 'hollow'}>
                      {person.hr.terminationDate ? (
                        <FormattedMessage
                          id="xpack.securitySolution.flyout.entityDetails.aiAgent.context.hrStatusWithDate"
                          defaultMessage="{status} on {date}"
                          values={{
                            status: person.hr.status,
                            date: (
                              <FormattedDate
                                value={person.hr.terminationDate}
                                year="numeric"
                                month="short"
                                day="numeric"
                                timeZone="UTC"
                              />
                            ),
                          }}
                        />
                      ) : (
                        person.hr.status
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  {person.hr.isMock && (
                    <EuiFlexItem grow={false}>
                      <GeneratedDataBadge />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              ) : (
                IDP_UNKNOWN
              ),
            },
            {
              title: WATCHLISTS_LABEL,
              description: (
                <WatchlistBadges
                  watchlists={watchlists}
                  data-test-subj={AI_AGENT_TEST_IDS.personWatchlists}
                />
              ),
            },
            { title: RISK_LABEL, description: <RiskValue row={primary} /> },
          ]}
        />
      </EuiPanel>
    );
  }
);
PersonCard.displayName = 'PersonCard';

const AgentList = ({ rows, onOpen }: { rows: readonly RelatedEntity[]; onOpen: OpenEntity }) => (
  <EuiFlexGroup direction="column" gutterSize="xs">
    {rows.map((row) => (
      <EuiFlexItem key={row.entityId}>
        <EuiText size="xs">
          <EntityLink
            row={row}
            label={`${getAgentDisplayName(row.agentName ?? '')} · ${row.userName ?? ''} · ${
              row.hostName ?? row.hostId ?? ''
            }`}
            onOpen={onOpen}
          />{' '}
          {row.riskLevel && <RiskLevelBadge riskLevel={row.riskLevel} />}
        </EuiText>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export interface ContextSectionProps {
  readonly context: AgentContext;
  readonly scopeId: string;
  /** Rendered below the "From the Entity Store" panel. */
  readonly riskSummary?: React.ReactNode;
}

/**
 * Identity and context: the facts the context maintainer keeps on the agent row, the person the
 * agent acts for (IdP status, MFA, watchlists), the host (criticality, risk, other agents), the
 * local user it runs as, and other installs on the same account. Each card opens that entity's
 * flyout.
 */
export const ContextSection = memo(({ context, scopeId, riskSummary }: ContextSectionProps) => {
  const { openEntityDetailsAsChild } = useFlyoutApi();
  const watchlistLookup = useWatchlistLookup();
  const {
    agent,
    host,
    runsAs,
    people,
    otherAgentsOnHost,
    otherInstallsOnAccount,
    signedInAs,
    signedInAt,
  } = context;

  const onOpen = useCallback(
    (row: RelatedEntity) =>
      openEntityDetailsAsChild({
        engineType: row.engineType,
        entityId: row.entityId,
        entityName:
          row.engineType === 'host'
            ? row.hostName ?? row.name
            : row.engineType === 'user'
            ? row.userName ?? row.name
            : row.name,
        scopeId,
        origin: FLYOUT_ORIGIN.ENTITIES_LIST,
      }),
    [openEntityDetailsAsChild, scopeId]
  );

  const sortedPeople = useMemo(
    () =>
      [...people].sort((a, b) => Number(b.email === signedInAs) - Number(a.email === signedInAs)),
    [people, signedInAs]
  );
  const storeContext = agent?.storeContext;
  const runsAsRoot = isRunningAsRoot(context);
  // The row's person facts are a union over every person, so they only stand in for a single card.
  const rowFacts = sortedPeople.length === 1 ? storeContext : undefined;

  return (
    <>
      <StoreContextPanel
        storeContext={storeContext}
        watchlistLookup={watchlistLookup}
        mfaIsMock={people.some(hasMockMfa)}
      />
      <EuiSpacer size="m" />
      {riskSummary}

      <SectionTitle>{ACTS_FOR_TITLE}</SectionTitle>
      {sortedPeople.length === 0 ? (
        <EuiText size="xs" color="subdued" data-test-subj={AI_AGENT_TEST_IDS.actsForNone}>
          {ACTS_FOR_NONE} <GapLink gapId={GAP_IDS.emailAfterSignIn} />
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {sortedPeople.map((person) => (
            <EuiFlexItem key={person.email}>
              <PersonCard
                person={person}
                isCurrent={signedInAs ? person.email === signedInAs : sortedPeople.length === 1}
                signedInAt={person.email === signedInAs ? signedInAt : undefined}
                onOpen={onOpen}
                watchlistLookup={watchlistLookup}
                rowFacts={rowFacts}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.host}>
            <SectionTitle>{HOST_TITLE}</SectionTitle>
            {host ? (
              <>
                <EuiText size="s">
                  <EntityLink
                    row={host}
                    label={host.hostName ?? host.name ?? host.entityId}
                    onOpen={onOpen}
                  />
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={[
                    {
                      title: CRITICALITY_LABEL,
                      description: (
                        <AssetCriticalityBadge
                          criticalityLevel={host.criticality ?? 'unassigned'}
                          textSize="xs"
                        />
                      ),
                    },
                    { title: RISK_LABEL, description: <RiskValue row={host} /> },
                  ]}
                />
              </>
            ) : (
              <EuiText size="xs" color="subdued">
                {HOST_NOT_FOUND}
              </EuiText>
            )}
            {otherAgentsOnHost.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs">
                  <strong>{OTHER_AGENTS_ON_HOST}</strong>
                </EuiText>
                <AgentList rows={otherAgentsOnHost} onOpen={onOpen} />
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s" data-test-subj={AI_AGENT_TEST_IDS.runsAs}>
            <SectionTitle>{RUNS_AS_TITLE}</SectionTitle>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {runsAs ? (
                    <EntityLink
                      row={runsAs}
                      label={runsAs.userName ?? runsAs.entityId}
                      onOpen={onOpen}
                    />
                  ) : (
                    agent?.userName
                  )}
                </EuiText>
              </EuiFlexItem>
              {runsAsRoot && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">{RUNS_AS_ROOT}</EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {!runsAs && (
              <EuiText size="xs" color="subdued">
                {RUNS_AS_NOT_FOUND}
              </EuiText>
            )}
            {runsAs && (
              <>
                <EuiSpacer size="xs" />
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={[{ title: RISK_LABEL, description: <RiskValue row={runsAs} /> }]}
                />
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <div data-test-subj={AI_AGENT_TEST_IDS.otherInstalls}>
        <SectionTitle>{OTHER_INSTALLS_TITLE}</SectionTitle>
        {otherInstallsOnAccount.length === 0 ? (
          <EuiText size="xs" color="subdued">
            {OTHER_INSTALLS_NONE}
          </EuiText>
        ) : (
          <>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.aiAgent.context.otherInstallsCount"
                defaultMessage="{count, plural, one {# other install has} other {# other installs have}} signed in with an account this install used."
                values={{ count: otherInstallsOnAccount.length }}
              />
            </EuiText>
            <AgentList rows={otherInstallsOnAccount} onOpen={onOpen} />
          </>
        )}
      </div>
    </>
  );
});
ContextSection.displayName = 'ContextSection';
