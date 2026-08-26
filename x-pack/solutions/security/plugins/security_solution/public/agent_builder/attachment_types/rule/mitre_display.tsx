/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, useEuiTheme } from '@elastic/eui';
import type { Threat } from '../../../../common/api/detection_engine/model/rule_schema';

/**
 * Renders a rule's MITRE ATT&CK mappings (tactic → techniques → subtechniques).
 *
 * This intentionally duplicates a subset of `ThreatEuiFlexGroup`
 * (`detection_engine/rule_creation_ui/components/description_step/threat_description.tsx`)
 * instead of reusing it. The rule attachment card renders inside the agent builder chat
 * flyout — a React tree without the Security Solution redux `<Provider>` — so it cannot
 * use components that reach for app context (`ThreatEuiFlexGroup` calls
 * `useIsExperimentalFeatureEnabled`, a redux `useSelector`, and throws there). Keep this
 * component free of Kibana/app context: plain props and EUI only.
 *
 * It also tolerates malformed entries: attachment data is model-generated JSON parsed
 * without schema validation, so `tactic`/`technique` fields may be missing.
 *
 * When the display of threat entries changes in `ThreatEuiFlexGroup`, propagate the
 * update here.
 */

interface MitreNode {
  id?: string;
  name?: string;
  reference?: string;
}

const mitreNodeLabel = ({ id, name }: MitreNode): string =>
  name && id ? `${name} (${id})` : name ?? id ?? '';

const MitreNodeLink: React.FC<{ node: MitreNode; 'data-test-subj': string }> = ({
  node,
  'data-test-subj': dataTestSubj,
}) => {
  const label = mitreNodeLabel(node);
  if (!label) {
    return null;
  }
  if (!node.reference) {
    return <span data-test-subj={dataTestSubj}>{label}</span>;
  }
  return (
    <EuiLink data-test-subj={dataTestSubj} href={node.reference} target="_blank">
      {label}
    </EuiLink>
  );
};

export const MitreAttackDisplay: React.FC<{ threat: Threat[] }> = ({ threat }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="mitreAttackDisplay">
      {threat.map((singleThreat, threatIndex) => {
        const tactic: MitreNode | undefined = singleThreat?.tactic;
        const techniques = singleThreat?.technique ?? [];
        if (!tactic && techniques.length === 0) {
          return null;
        }
        return (
          <EuiFlexItem key={tactic?.id ?? threatIndex} grow={false}>
            {tactic && <MitreNodeLink node={tactic} data-test-subj="mitreTacticLink" />}
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              alignItems="flexStart"
              css={{ marginLeft: euiTheme.size.m }}
            >
              {techniques.map((technique, techniqueIndex) => (
                <EuiFlexItem key={technique?.id ?? techniqueIndex} grow={false}>
                  <MitreNodeLink node={technique} data-test-subj="mitreTechniqueLink" />
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="none"
                    alignItems="flexStart"
                    css={{ marginLeft: euiTheme.size.m }}
                  >
                    {(technique?.subtechnique ?? []).map((subtechnique, subtechniqueIndex) => (
                      <EuiFlexItem key={subtechnique?.id ?? subtechniqueIndex} grow={false}>
                        <MitreNodeLink node={subtechnique} data-test-subj="mitreSubtechniqueLink" />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
