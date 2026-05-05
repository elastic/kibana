/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import type { BuildThreatDescription } from './types';
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../../common/detection_engine/mitre/types';
import ListTreeIcon from './assets/list_tree_icon.svg';

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
};

const threatEuiFlexGroupStyles = css`
  .euiFlexItem {
    margin-bottom: 0;
  }
`;

const techniqueLinkItemStyles = css`
  .euiIcon {
    width: 8px;
    height: 8px;
  }

  align-self: flex-start;
`;

export const ThreatEuiFlexGroup = ({
  threat,
  'data-test-subj': dataTestSubj = 'threat',
}: BuildThreatDescription) => {
  const { euiTheme } = useEuiTheme();
  const [techniquesOptions, setTechniquesOptions] = useState<MitreTechnique[]>([]);
  const [tacticsOptions, setTacticsOptions] = useState<MitreTactic[]>([]);
  const [subtechniquesOptions, setSubtechniquesOptions] = useState<MitreSubTechnique[]>([]);

  useEffect(() => {
    async function getMitre() {
      const mitreConfig = await lazyMitreConfiguration();
      setSubtechniquesOptions(mitreConfig.subtechniques);
      setTechniquesOptions(mitreConfig.techniques);
      setTacticsOptions(mitreConfig.tactics);
    }
    getMitre();
  }, []);

  return (
    <EuiFlexGroup direction="column" data-test-subj={dataTestSubj} css={threatEuiFlexGroupStyles}>
      {threat.map((singleThreat, index) => {
        const tactic = tacticsOptions.find((t) => t.id === singleThreat.tactic.id);
        return (
          <EuiFlexItem key={`${singleThreat.tactic.name}-${index}`}>
            <EuiLink
              data-test-subj="threatTacticLink"
              href={singleThreat.tactic.reference}
              target="_blank"
            >
              {tactic != null
                ? tactic.label
                : `${singleThreat.tactic.name} (${singleThreat.tactic.id})`}
            </EuiLink>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
              {singleThreat.technique &&
                singleThreat.technique.map((technique, techniqueIndex) => {
                  const myTechnique = techniquesOptions.find((t) => t.id === technique.id);
                  return (
                    <EuiFlexItem key={myTechnique?.id ?? techniqueIndex}>
                      <EuiButtonEmpty
                        data-test-subj="threatTechniqueLink"
                        href={technique.reference}
                        target="_blank"
                        iconType={ListTreeIcon}
                        size="xs"
                        css={techniqueLinkItemStyles}
                      >
                        {myTechnique != null
                          ? myTechnique.label
                          : `${technique.name} (${technique.id})`}
                      </EuiButtonEmpty>
                      <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                        {technique.subtechnique != null &&
                          technique.subtechnique.map((subtechnique, subtechniqueIndex) => {
                            const mySubtechnique = subtechniquesOptions.find(
                              (t) => t.id === subtechnique.id
                            );
                            return (
                              <EuiFlexItem
                                key={mySubtechnique?.id ?? subtechniqueIndex}
                                css={{ marginLeft: euiTheme.size.m }}
                              >
                                <EuiButtonEmpty
                                  data-test-subj="threatSubtechniqueLink"
                                  href={subtechnique.reference}
                                  target="_blank"
                                  iconType={ListTreeIcon}
                                  size="xs"
                                  css={techniqueLinkItemStyles}
                                >
                                  {mySubtechnique != null
                                    ? mySubtechnique.label
                                    : `${subtechnique.name} (${subtechnique.id})`}
                                </EuiButtonEmpty>
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
    </EuiFlexGroup>
  );
};
