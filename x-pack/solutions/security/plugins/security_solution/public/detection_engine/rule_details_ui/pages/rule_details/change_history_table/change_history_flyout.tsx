/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { flatten } from 'flat';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { RuleAboutSection } from '../../../../rule_management/components/rule_details/rule_about_section';
import { DiffView } from '../../../../rule_management/components/rule_details/json_diff/diff_view';
import { convertFieldToDisplayName } from '../../../../rule_management/components/rule_details/helpers';
import { SplitAccordion } from '../../../../../common/components/split_accordion';
import type { ChangeHistoryResult } from '../../../../rule_management/api/hooks/use_change_history';
import * as i18n from './translations';
import { IGNORED_FIELDS } from './change_history_table';

interface ChangeHistoryFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  change?: ChangeHistoryResult;
}

const shortenFieldName = (f: string) => f.split('.').pop() ?? f;

const prepareForDiff = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  switch (typeof value) {
    case 'object':
      return JSON.stringify(value, null, 2);
    default: // string, number, boolean, bigint
      return String(value);
  }
};

export const ChangeHistoryFlyout = ({ isOpen, onClose, change }: ChangeHistoryFlyoutProps) => {
  if (!isOpen || !change) return null;
  const [selectedTab, setSelectedTab] = useState('changes');
  const onSelectedTabChanged = (id: string) => setSelectedTab(id);

  const flatSnapshot = flatten(change.snapshot, { safe: true }) as Record<string, unknown>;
  const filteredChanges = change.changes.filter((f) => !IGNORED_FIELDS.includes(f));

  const changeDetailsTabContent = filteredChanges.map((c) => {
    const fieldName = shortenFieldName(c);
    const oldSource = prepareForDiff(change?.oldvalues?.[c]);
    const newSource = prepareForDiff(flatSnapshot[c]);
    return (
      <React.Fragment key={c}>
        <SplitAccordion
          header={
            <EuiTitle size="xs">
              <h5>{convertFieldToDisplayName(fieldName)}</h5>
            </EuiTitle>
          }
          initialIsOpen={true}
        >
          <EuiFlexGroup justifyContent="spaceBetween">
            <DiffView viewType={'unified'} oldSource={oldSource} newSource={newSource} />
          </EuiFlexGroup>
        </SplitAccordion>
        <EuiSpacer size="l" />
      </React.Fragment>
    );
  });

  const tabs = {
    changes: {
      title: 'Change details',
      body: (
        <>
          {(!filteredChanges.length && <p>{'No changes detected.'}</p>) || changeDetailsTabContent}
        </>
      ),
    },
    overview: {
      title: 'Overview at save',
      body: (
        <>
          <EuiAccordion
            id={'about'}
            buttonContent={
              <EuiTitle data-test-subj="changeHistoryDetailOverviewTitle" size="m">
                <h3>{'About'}</h3>
              </EuiTitle>
            }
            initialIsOpen={true}
            data-test-subj="changeHistoryDetailOverview"
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <RuleAboutSection
                rule={change.ruleResponse as Partial<RuleResponse>}
                hideName={false}
                hideDescription={false}
              />
            </EuiFlexGroup>
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      ),
    },
  } as Record<string, { title: string; body: JSX.Element }>;

  return (
    <EuiFlyout
      ownFocus
      onClose={() => {
        setSelectedTab('changes');
        onClose();
      }}
      size="l"
      aria-labelledby="changeDetailsFlyoutTitle"
      data-test-subj="gap-auto-fill-logs"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="changeDetailsFlyoutTitle">{i18n.CHANGE_DETAILS_FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <strong>{'Comparing: '}</strong>
          {'Revision'}
          <EuiBadge color="hollow">{change.revision}</EuiBadge>
          {' against '}
          <EuiBadge color="hollow">{change.revision}</EuiBadge>
          <strong style={{ marginLeft: '0.5em' }}>{' Updated by: '}</strong>
          {change.userId}
          {' on '}
          {change.timestamp}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <strong>{'Field changes: '}</strong>
          {filteredChanges.map(shortenFieldName).map(convertFieldToDisplayName).join(', ')}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder={false} style={{ marginBottom: '-24px' }}>
          {Object.entries(tabs).map(([k, v]) => (
            <EuiTab onClick={() => onSelectedTabChanged(k)} isSelected={k === selectedTab} key={k}>
              {v.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{tabs[selectedTab]?.body}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
