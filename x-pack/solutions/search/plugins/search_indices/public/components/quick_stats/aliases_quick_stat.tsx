/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiI18nNumber, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { QuickStat } from './quick_stat';
import { AliasesContentStyle } from './styles';

export interface AliasesStatProps {
  aliases: string[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AliasesStat = ({ aliases, open, setOpen }: AliasesStatProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <QuickStat
      open={open}
      setOpen={setOpen}
      icon="symlink"
      iconColor={euiTheme.colors.fullShade}
      title={i18n.translate('xpack.searchIndices.quickStats.aliases_heading', {
        defaultMessage: 'Aliases',
      })}
      data-test-subj="QuickStatsAliases"
      secondaryTitle={<EuiI18nNumber value={aliases.length} />}
      content={
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={AliasesContentStyle}
          className="eui-yScroll"
        >
          {aliases.map((alias, i) => (
            <EuiFlexItem key={`alias.${i}`}>
              <EuiText size="s" color="subdued">
                {alias}
              </EuiText>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      }
      stats={[]}
    />
  );
};
