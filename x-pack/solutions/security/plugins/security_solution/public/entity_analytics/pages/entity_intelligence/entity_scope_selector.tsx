/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type IntelligenceScope = 'all' | 'entities' | 'agents';

export const EntityScopeSelector: React.FC<{
  scope: IntelligenceScope;
  compact?: boolean;
  onChange: (scope: IntelligenceScope) => void;
}> = ({ scope, onChange, compact = false }) => (
  <>
    <EuiButtonGroup
      legend={i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.scope.legend', {
        defaultMessage: 'Entity inventory',
      })}
      options={[
        {
          id: 'all',
          label: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.scope.all', {
            defaultMessage: 'All identities',
          }),
        },
        {
          id: 'entities',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.scope.entities',
            {
              defaultMessage: 'Users, hosts & services',
            }
          ),
        },
        {
          id: 'agents',
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.scope.agents',
            {
              defaultMessage: 'AI agents',
            }
          ),
        },
      ]}
      idSelected={scope}
      onChange={(id) => onChange(id === 'agents' || id === 'entities' ? id : 'all')}
      buttonSize="s"
      data-test-subj="entityIntelligenceScope"
    />
    {!compact && <EuiSpacer size="l" />}
  </>
);
