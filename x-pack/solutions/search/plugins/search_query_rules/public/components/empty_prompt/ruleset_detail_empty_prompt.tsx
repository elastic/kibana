/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import queryRulesImg from '../../assets/query-rules-context-alt.svg';
import queryRulesDarkImg from '../../assets/query-rules-context-alt-dark.svg';

export const RulesetDetailEmptyPrompt = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const positionRelative = css({
    position: 'relative',
  });
  const imgProps = css({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  });
  const gradientOverlay = css({
    background: `linear-gradient(180deg, ${transparentize(
      euiTheme.colors.backgroundBasePlain,
      0
    )}, ${transparentize(euiTheme.colors.backgroundBasePlain, 1)} 100%)`,
    position: 'absolute',
    bottom: 0,
    height: '30px',
    width: '100%',
  });

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="l">
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
        <EuiFlexItem grow={false}>
          <EuiText textAlign="center" size="s" color="subdued">
            <FormattedMessage
              id="xpack.searchQueryRules.rulesetDetailEmptyPrompt.title"
              defaultMessage="Add your first rule"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow css={positionRelative}>
          <img
            src={colorMode === 'DARK' ? queryRulesDarkImg : queryRulesImg}
            alt="Query Rules"
            css={imgProps}
          />
          <div css={gradientOverlay}>&nbsp;</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
