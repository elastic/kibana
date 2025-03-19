/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface SynonymsSetEmptyRulesCardsProps {
  onCreateRule: (type: 'equivalent' | 'explicit') => void;
}
export const SynonymsSetEmptyRulesCards: React.FC<SynonymsSetEmptyRulesCardsProps> = ({
  onCreateRule,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem
        css={css`
          min-width: ${euiTheme.base * 24}px;
        `}
      >
        <EuiCard
          hasBorder
          textAlign="left"
          title={i18n.translate(
            'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.title',
            {
              defaultMessage: 'Equivalent',
            }
          )}
          description={i18n.translate(
            'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.description',
            {
              defaultMessage: 'Defines groups of words that are the same.',
            }
          )}
          footer={
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="searchSynonymsSynonymsSetEmptyRulesCardsAddEquivalentRuleButton"
                  color="primary"
                  onClick={() => onCreateRule('equivalent')}
                >
                  {i18n.translate(
                    'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.addRuleButton',
                    {
                      defaultMessage: 'Add equivalent rule',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.example.computer',
                      {
                        defaultMessage: 'computer',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.example.laptop',
                      {
                        defaultMessage: 'laptop',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.example.pc',
                      {
                        defaultMessage: 'pc',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCard>
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          min-width: ${euiTheme.base * 24}px;
        `}
      >
        <EuiCard
          textAlign="left"
          hasBorder
          title={i18n.translate('xpack.searchSynonyms.synonymsSetEmptyRulesCards.explicit.title', {
            defaultMessage: 'Explicit',
          })}
          description={i18n.translate(
            'xpack.searchSynonyms.synonymsSetEmptyRulesCards.explicit.description',
            {
              defaultMessage: 'Matches a group of words to another word.',
            }
          )}
          footer={
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="searchSynonymsSynonymsSetEmptyRulesCardsAddExplicitRuleButton"
                  color="primary"
                  onClick={() => onCreateRule('explicit')}
                >
                  {i18n.translate(
                    'xpack.searchSynonyms.synonymsSetEmptyRulesCards.explicit.addRuleButton',
                    {
                      defaultMessage: 'Add explicit rule',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.explicit.example.jacket',
                      {
                        defaultMessage: 'jacket',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.example.parka',
                      {
                        defaultMessage: 'parka',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <b>{'=>'}</b>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate(
                      'xpack.searchSynonyms.synonymsSetEmptyRulesCards.equivalent.example.coat',
                      {
                        defaultMessage: 'coat',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCard>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
