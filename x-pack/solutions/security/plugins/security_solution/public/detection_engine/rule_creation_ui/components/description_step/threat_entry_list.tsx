/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { MitreEntitySummaryBuckets } from '@kbn/security-mitre-attack-common';
import { getMitreEntityDisplayName } from '@kbn/security-mitre-attack-common';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import ListTreeIcon from './assets/list_tree_icon.svg';
import * as i18n from './translations';

const techniqueLinkItemStyles = css`
  .euiIcon {
    width: 8px;
    height: 8px;
  }

  align-self: flex-start;
`;

const UnsupportedMitreIdWarning = ({
  id,
  frameworkLabel,
}: {
  id: string;
  frameworkLabel: string;
}) => (
  <EuiIconTip
    type="warning"
    color="warning"
    size="s"
    content={i18n.UNSUPPORTED_MITRE_ID_WARNING(id, frameworkLabel)}
    aria-label={i18n.UNSUPPORTED_MITRE_ID_WARNING(id, frameworkLabel)}
    iconProps={{ 'data-test-subj': `threatUnsupportedMitreIdWarning-${id}` }}
  />
);

export interface ThreatEntryResolution extends MitreEntitySummaryBuckets {
  showUnsupportedWarnings: boolean;
  frameworkLabel: string;
}

interface ThreatEntryListProps {
  entries: Threats;
  /** MITRE data of the entries' framework; undefined for unrecognized frameworks (rendered as saved). */
  resolve: ThreatEntryResolution | undefined;
}

type ThreatTactic = Threat['tactic'];
type ThreatTechnique = NonNullable<Threat['technique']>[number];
type ThreatSubtechnique = NonNullable<ThreatTechnique['subtechnique']>[number];

interface ResolveProps {
  /** MITRE data of the entries' framework; undefined for unrecognized frameworks (rendered as saved). */
  resolve: ThreatEntryResolution | undefined;
}

const ThreatTacticLink = ({ tactic, resolve }: ResolveProps & { tactic: ThreatTactic }) => {
  const resolvedTactic = resolve?.tactics.find((t) => t.id === tactic.id);
  const isUnsupported = (resolve?.showUnsupportedWarnings ?? false) && resolvedTactic == null;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="threatTacticLink" href={tactic.reference} target="_blank">
          {resolvedTactic != null
            ? getMitreEntityDisplayName(resolvedTactic)
            : getMitreEntityDisplayName(tactic)}
        </EuiLink>
      </EuiFlexItem>
      {isUnsupported && (
        <EuiFlexItem grow={false}>
          <UnsupportedMitreIdWarning
            id={tactic.id}
            frameworkLabel={resolve?.frameworkLabel ?? ''}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const ThreatSubtechniqueItem = ({
  subtechnique,
  resolve,
}: ResolveProps & { subtechnique: ThreatSubtechnique }) => {
  const { euiTheme } = useEuiTheme();
  const resolvedSubtechnique = resolve?.subtechniques.find((t) => t.id === subtechnique.id);
  const isUnsupported = (resolve?.showUnsupportedWarnings ?? false) && resolvedSubtechnique == null;
  return (
    <EuiFlexItem css={{ marginLeft: euiTheme.size.m }}>
      <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="threatSubtechniqueLink"
            href={subtechnique.reference}
            target="_blank"
            iconType={ListTreeIcon}
            size="xs"
            css={techniqueLinkItemStyles}
          >
            {resolvedSubtechnique != null
              ? getMitreEntityDisplayName(resolvedSubtechnique)
              : getMitreEntityDisplayName(subtechnique)}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {isUnsupported && (
          <EuiFlexItem grow={false}>
            <UnsupportedMitreIdWarning
              id={subtechnique.id}
              frameworkLabel={resolve?.frameworkLabel ?? ''}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const ThreatTechniqueItem = ({
  technique,
  resolve,
}: ResolveProps & { technique: ThreatTechnique }) => {
  const resolvedTechnique = resolve?.techniques.find((t) => t.id === technique.id);
  const isUnsupported = (resolve?.showUnsupportedWarnings ?? false) && resolvedTechnique == null;
  return (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="threatTechniqueLink"
            href={technique.reference}
            target="_blank"
            iconType={ListTreeIcon}
            size="xs"
            css={techniqueLinkItemStyles}
          >
            {resolvedTechnique != null
              ? getMitreEntityDisplayName(resolvedTechnique)
              : getMitreEntityDisplayName(technique)}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {isUnsupported && (
          <EuiFlexItem grow={false}>
            <UnsupportedMitreIdWarning
              id={technique.id}
              frameworkLabel={resolve?.frameworkLabel ?? ''}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
        {technique.subtechnique != null &&
          technique.subtechnique.map((subtechnique, subtechniqueIndex) =>
            subtechnique == null ? null : (
              <ThreatSubtechniqueItem
                key={`${subtechnique.id}-${subtechniqueIndex}`}
                subtechnique={subtechnique}
                resolve={resolve}
              />
            )
          )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const ThreatEntryList = ({ entries, resolve }: ThreatEntryListProps) => (
  <>
    {entries.map((threat, index) => {
      const tactic = threat?.tactic;
      return (
        <EuiFlexItem key={`${tactic?.name ?? 'threat'}-${index}`}>
          {tactic ? <ThreatTacticLink tactic={tactic} resolve={resolve} /> : null}
          <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
            {threat?.technique &&
              threat.technique.map((technique, techniqueIndex) =>
                technique == null ? null : (
                  <ThreatTechniqueItem
                    key={`${technique.id}-${techniqueIndex}`}
                    technique={technique}
                    resolve={resolve}
                  />
                )
              )}
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    })}
  </>
);
