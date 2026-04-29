/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n as i18nTranslate } from '@kbn/i18n';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { Rule } from '../../../rule_management/logic';

interface LegacyUrlConflictCallOutProps {
  rule: Rule | null;
  spacesApi?: SpacesApi;
}

export const LegacyUrlConflictCallOut = React.memo<LegacyUrlConflictCallOutProps>(
  ({ rule, spacesApi }) => {
    if (rule?.alias_target_id != null && spacesApi && rule.outcome === 'conflict') {
      const aliasTargetId = rule.alias_target_id;
      // We have resolved to one rule, but there is another one with a legacy URL associated with this page. Display a
      // callout with a warning for the user, and provide a way for them to navigate to the other rule.
      const otherRulePath = `rules/id/${aliasTargetId}${window.location.search}${window.location.hash}`;
      return (
        <div data-test-subj="legacyUrlConflictCallOut-wrapper">
          <EuiSpacer />
          {spacesApi.ui.components.getLegacyUrlConflict({
            objectNoun: i18nTranslate.translate(
              'xpack.securitySolution.sections.ruleDetails.redirectObjectNoun',
              {
                defaultMessage: 'rule',
              }
            ),
            currentObjectId: rule.id,
            otherObjectId: aliasTargetId,
            otherObjectPath: otherRulePath,
          })}
        </div>
      );
    }
    return null;
  }
);

LegacyUrlConflictCallOut.displayName = 'LegacyUrlConflictCallOut';
