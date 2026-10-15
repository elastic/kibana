/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { THREAT_FRAMEWORK_NAME, groupThreatsByFramework } from '@kbn/security-mitre-attack-common';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { BuildThreatDescription } from './types';
import * as i18n from './translations';
import { ThreatEntryList } from './threat_entry_list';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

const threatEuiFlexGroupStyles = css`
  .euiFlexItem {
    margin-bottom: 0;
  }
`;

const ThreatFrameworkGroup = ({
  framework,
  entries,
}: {
  framework: MitreFramework;
  entries: Threats;
}) => {
  const { tactics, techniques, subtechniques, isLoading, isError } = useMitreConfiguration({
    framework,
  });

  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );

  // Wait for the MITRE dataset before deciding an id is unsupported, otherwise
  // every entry would briefly render a false-positive warning on mount. The `tactics.length > 0`
  // guard handles the case where the managed source hasn't finished populating yet:
  // `ensureInitialized()` may be false, returning an empty 200 with isLoading:false and
  // isError:false. Also gated on the feature flag so we don't surface any warnings when
  // it's disabled.
  const showUnsupportedWarnings =
    isMitreAttackUpdatesUIEnabled && !isLoading && !isError && tactics.length > 0;

  return (
    <ThreatEntryList
      entries={entries}
      resolve={{
        tactics,
        techniques,
        subtechniques,
        showUnsupportedWarnings,
        frameworkLabel: THREAT_FRAMEWORK_NAME[framework],
      }}
    />
  );
};

/**
 * NOTE: the agent builder rule attachment renders MITRE mappings with its own
 * context-free copy of this component
 * (`public/agent_builder/attachment_types/rule/mitre_display.tsx`), because this one
 * depends on the Security Solution redux store (via `useIsExperimentalFeatureEnabled`)
 * and throws when rendered outside the app's `<Provider>` (e.g. in the agent builder
 * chat flyout). If you change how threat entries are displayed here, propagate the
 * update there.
 */
export const ThreatEuiFlexGroup = ({
  threat,
  'data-test-subj': dataTestSubj = 'threat',
}: BuildThreatDescription) => {
  const groups = useMemo(() => groupThreatsByFramework(threat), [threat]);

  return (
    <EuiFlexGroup direction="column" data-test-subj={dataTestSubj} css={threatEuiFlexGroupStyles}>
      {groups.map(({ framework, label, threats }) => {
        return (
          <EuiFlexItem
            key={framework ?? `unknown-${label}`}
            data-test-subj={`threatFrameworkGroup-${framework ?? 'unknown'}`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxxs">
                  <h5 data-test-subj="threatFrameworkGroupTitle">
                    {label || i18n.UNKNOWN_FRAMEWORK_LABEL}
                  </h5>
                </EuiTitle>
              </EuiFlexItem>
              {framework === undefined && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="warning"
                    color="warning"
                    size="s"
                    content={i18n.UNKNOWN_FRAMEWORK_WARNING}
                    aria-label={i18n.UNKNOWN_FRAMEWORK_WARNING}
                    iconProps={{ 'data-test-subj': 'threatUnknownFrameworkWarning' }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {framework === undefined ? (
              <ThreatEntryList entries={threats} resolve={undefined} />
            ) : (
              <ThreatFrameworkGroup framework={framework} entries={threats} />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
