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
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
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

export const ThreatEntryList = ({ entries, resolve }: ThreatEntryListProps) => {
  const { euiTheme } = useEuiTheme();
  const showUnsupportedWarnings = resolve?.showUnsupportedWarnings ?? false;
  const frameworkLabel = resolve?.frameworkLabel ?? '';

  return (
    <>
      {entries.map((singleThreat, index) => {
        const threatTactic = singleThreat?.tactic;
        const tactic = threatTactic
          ? resolve?.tactics.find((t) => t.id === threatTactic.id)
          : undefined;
        const tacticUnsupported = showUnsupportedWarnings && threatTactic != null && tactic == null;
        return (
          <EuiFlexItem key={`${threatTactic?.name ?? 'threat'}-${index}`}>
            {threatTactic ? (
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    data-test-subj="threatTacticLink"
                    href={threatTactic.reference}
                    target="_blank"
                  >
                    {tactic != null
                      ? getMitreEntityDisplayName(tactic)
                      : getMitreEntityDisplayName(threatTactic)}
                  </EuiLink>
                </EuiFlexItem>
                {tacticUnsupported && (
                  <EuiFlexItem grow={false}>
                    <UnsupportedMitreIdWarning
                      id={threatTactic.id}
                      frameworkLabel={frameworkLabel}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ) : null}
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
              {singleThreat?.technique &&
                singleThreat.technique.map((technique, techniqueIndex) => {
                  if (technique == null) {
                    return null;
                  }
                  const myTechnique = resolve?.techniques.find((t) => t.id === technique.id);
                  const techniqueUnsupported = showUnsupportedWarnings && myTechnique == null;
                  return (
                    <EuiFlexItem key={`${technique.id}-${techniqueIndex}`}>
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
                            {myTechnique != null
                              ? getMitreEntityDisplayName(myTechnique)
                              : getMitreEntityDisplayName(technique)}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                        {techniqueUnsupported && (
                          <EuiFlexItem grow={false}>
                            <UnsupportedMitreIdWarning
                              id={technique.id}
                              frameworkLabel={frameworkLabel}
                            />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                      <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                        {technique.subtechnique != null &&
                          technique.subtechnique.map((subtechnique, subtechniqueIndex) => {
                            if (subtechnique == null) {
                              return null;
                            }
                            const mySubtechnique = resolve?.subtechniques.find(
                              (t) => t.id === subtechnique.id
                            );
                            const subtechniqueUnsupported =
                              showUnsupportedWarnings && mySubtechnique == null;
                            return (
                              <EuiFlexItem
                                key={`${subtechnique.id}-${subtechniqueIndex}`}
                                css={{ marginLeft: euiTheme.size.m }}
                              >
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
                                      {mySubtechnique != null
                                        ? getMitreEntityDisplayName(mySubtechnique)
                                        : getMitreEntityDisplayName(subtechnique)}
                                    </EuiButtonEmpty>
                                  </EuiFlexItem>
                                  {subtechniqueUnsupported && (
                                    <EuiFlexItem grow={false}>
                                      <UnsupportedMitreIdWarning
                                        id={subtechnique.id}
                                        frameworkLabel={frameworkLabel}
                                      />
                                    </EuiFlexItem>
                                  )}
                                </EuiFlexGroup>
                              </EuiFlexItem>
                            );
                          })}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  );
                })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </>
  );
};
