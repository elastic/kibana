/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import type { SecurityFinding } from './types';

interface FindingPolicyEvidenceProps {
  policy: NonNullable<SecurityFinding['policy']>;
  redactor: ContentRedactor;
}

/** Displays the matched clause and the policy snapshot recorded with the decision. */
export const FindingPolicyEvidence: React.FC<FindingPolicyEvidenceProps> = ({
  policy,
  redactor,
}) => {
  const { euiTheme } = useEuiTheme();
  const policyId = useGeneratedHtmlId({ prefix: 'findingPolicy' });
  const redact = (value: string, limit = 1200): string => redactor.redact(value, limit).text;
  return (
    <div data-test-subj="securityFindingPolicy">
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.label',
              { defaultMessage: 'Matched policy' }
            )}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiTitle size="xxs">
            <h3>{redact(policy.name, 240)}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {policy.version && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.version',
                {
                  defaultMessage: 'Version {version}',
                  values: { version: redact(policy.version, 80) },
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <EuiIcon type="gear" aria-hidden={true} />{' '}
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.engine',
          {
            defaultMessage: 'Evaluated by {engine}',
            values: { engine: redact(policy.engine, 240) },
          }
        )}
      </EuiText>
      {policy.clause && (
        <>
          <EuiSpacer size="m" />
          <div
            css={css`
              padding: ${euiTheme.size.m};
              border-left: 3px solid ${euiTheme.colors.warning};
              border-radius: ${euiTheme.border.radius.small};
              background: ${transparentize(euiTheme.colors.warning, 0.06)};
            `}
          >
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.matchedClause',
                { defaultMessage: 'Matched clause' }
              )}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <strong>{redact(policy.clause.name, 240)}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiText size="s">{redact(policy.clause.condition, 8192)}</EuiText>
            <EuiSpacer size="s" />
            <EuiBadge color="hollow">
              {policy.mode === 'monitor'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.monitorOnly',
                    { defaultMessage: 'Detect only · no blocking' }
                  )
                : policy.clause.expected === 'deny'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.expectedDeny',
                    { defaultMessage: 'Expected decision: deny' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.expectedAllow',
                    { defaultMessage: 'Expected decision: allow' }
                  )}
            </EuiBadge>
          </div>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiAccordion
        id={policyId}
        buttonContent={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.viewPolicy',
          { defaultMessage: 'View policy' }
        )}
        paddingSize="m"
      >
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.snapshot',
            { defaultMessage: 'Recorded policy snapshot at the time of this decision.' }
          )}
        </EuiText>
        <EuiSpacer size="m" />
        {policy.definition ? (
          <>
            <EuiText size="s">
              <p>{redact(policy.definition.description)}</p>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.scope',
                {
                  defaultMessage: 'Scope: {scope}',
                  values: { scope: redact(policy.definition.scope) },
                }
              )}
            </EuiText>
            <EuiSpacer size="m" />
            <div
              css={css`
                display: grid;
                gap: ${euiTheme.size.m};
              `}
            >
              {policy.definition.clauses.map((clause) => (
                <div
                  key={clause.id}
                  css={css`
                    padding: ${euiTheme.size.m};
                    border: ${euiTheme.border.thin};
                    border-radius: ${euiTheme.border.radius.medium};
                  `}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{redact(clause.name, 240)}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    {clause.id === policy.clause?.id && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning">
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.matchedBadge',
                            { defaultMessage: 'Matched' }
                          )}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {policy.mode === 'monitor'
                          ? i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.monitorAction',
                              { defaultMessage: 'Create finding' }
                            )
                          : clause.expected === 'deny'
                          ? i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.deny',
                              { defaultMessage: 'Deny' }
                            )
                          : i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.allow',
                              { defaultMessage: 'Allow' }
                            )}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiText size="s">{redact(clause.condition, 8192)}</EuiText>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    <EuiCode>{redact(clause.id, 160)}</EuiCode>
                  </EuiText>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.definitionMissing',
              { defaultMessage: 'The policy definition was not captured with this decision.' }
            )}
          </EuiText>
        )}
        <EuiSpacer size="m" />
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            overflow-wrap: anywhere;
          `}
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.identifier',
            { defaultMessage: 'Policy ID: {id}', values: { id: redact(policy.id, 256) } }
          )}
        </EuiText>
        {policy.sha256 && (
          <>
            <EuiSpacer size="xs" />
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingPolicy.digest',
                {
                  defaultMessage: 'Recorded SHA-256: {hash}',
                  values: { hash: redact(policy.sha256, 256) },
                }
              )}
            </EuiText>
          </>
        )}
      </EuiAccordion>
    </div>
  );
};
