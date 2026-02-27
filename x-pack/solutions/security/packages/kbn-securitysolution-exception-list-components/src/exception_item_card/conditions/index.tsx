/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { EntryContent } from './entry_content';
import { OsCondition } from './os_conditions';
import type { CriteriaConditionsProps, Entry } from './types';

export const ExceptionItemCardConditions = memo<CriteriaConditionsProps>(
  ({ os, entries, dataTestSubj, showValueListModal }) => {
    const { euiTheme } = useEuiTheme();
    const borderStyles = css`
      border: ${euiTheme.border.thin};
    `;

    return (
      <EuiPanel
        color="subdued"
        hasBorder={true}
        hasShadow={false}
        data-test-subj={dataTestSubj}
        css={borderStyles}
        className="eui-xScroll"
      >
        {os?.length ? <OsCondition os={os} dataTestSubj={dataTestSubj} /> : null}
        {entries.map((entry: Entry, index: number) => {
          const nestedEntries = 'entries' in entry ? entry.entries : [];
          return (
            <div key={`ExceptionItemCardConditionsContainer${index}`}>
              <EntryContent
                key={`entry${index}`}
                entry={entry}
                index={index}
                dataTestSubj={dataTestSubj}
                showValueListModal={showValueListModal}
              />
              {nestedEntries?.length
                ? nestedEntries.map((nestedEntry: Entry, nestedIndex: number) => (
                    <EntryContent
                      key={`nestedEntry${index}${nestedIndex}`}
                      entry={nestedEntry}
                      index={nestedIndex}
                      isNestedEntry={true}
                      dataTestSubj={dataTestSubj}
                      showValueListModal={showValueListModal}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </EuiPanel>
    );
  }
);
ExceptionItemCardConditions.displayName = 'ExceptionItemCardConditions';
