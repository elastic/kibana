/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { flatten } from 'flat';
import moment from 'moment';
import React, { useState } from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { SplitAccordion } from '../../../../common/components/split_accordion';
import type { ChangeHistoryResult } from '../../../rule_management/api/hooks/use_change_history';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from '../../../rule_management/components/rule_details/constants';
import { convertFieldToDisplayName } from '../../../rule_management/components/rule_details/helpers';
import { DiffView } from '../../../rule_management/components/rule_details/json_diff/diff_view';
import { RuleAboutSection } from '../../../rule_management/components/rule_details/rule_about_section';
import { RuleDefinitionSection } from '../../../rule_management/components/rule_details/rule_definition_section';
import { ChangeHistoryConfirmRestoreModal } from './confirm_restore_modal';
import { DATE_DISPLAY_FORMAT_WITH_SECONDS, IGNORED_FIELDS } from './constants';
import * as i18n from './translations';

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
  const [selectedTab, setSelectedTab] = useState('changes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onSelectedTabChanged = (id: string) => setSelectedTab(id);

  if (!isOpen || !change) return null;

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

  const closeFlyout = () => {
    setSelectedTab('changes');
    onClose();
  };

  const previousRevision = Number(change.previousRevision);
  const isRevisionUpdated = previousRevision > -1 && previousRevision !== change.revision;
  const tabs = {
    changes: {
      title: i18n.CHANGE_DETAILS_TAB_TITLE,
      body: (
        <>
          {(!filteredChanges.length && <p>{i18n.NO_CHANGES_DETECTED}</p>) ||
            changeDetailsTabContent}
        </>
      ),
    },
    overview: {
      title: i18n.OVERVIEW_AT_SAVE_TAB_TITLE,
      body: (
        <>
          <EuiAccordion
            id={'about'}
            buttonContent={
              <EuiTitle data-test-subj="changeHistoryDetailOverviewAboutTitle" size="m">
                <h3>{i18n.OVERVIEW_ABOUT_TITLE}</h3>
              </EuiTitle>
            }
            initialIsOpen={true}
            data-test-subj="changeHistoryDetailAboutSection"
          >
            <EuiFlexGroup justifyContent="spaceBetween">
              <RuleAboutSection
                rule={change.rule as Partial<RuleResponse>}
                hideName={false}
                hideDescription={false}
              />
            </EuiFlexGroup>
          </EuiAccordion>
          <EuiSpacer size="m" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />
          <EuiAccordion
            id={'definition'}
            buttonContent={
              <EuiTitle data-test-subj="changeHistoryDetailOverviewDefinitionTitle" size="m">
                <h3>{i18n.OVERVIEW_DEFINITION_TITLE}</h3>
              </EuiTitle>
            }
            initialIsOpen={true}
            data-test-subj="changeHistoryDetailDefinitionSection"
          >
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="spaceBetween">
              <RuleDefinitionSection
                rule={change.rule as Partial<RuleResponse>}
                columnWidths={DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS}
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
      onClose={closeFlyout}
      size="m"
      aria-labelledby="changeDetailsFlyoutTitle"
      data-test-subj="gap-auto-fill-logs"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="changeDetailsFlyoutTitle">{i18n.CHANGE_DETAILS_FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <strong>{i18n.COMPARING_LABEL}</strong>
          {i18n.REVISION_LABEL}
          <EuiBadge color="hollow">{change.revision}</EuiBadge>
          {isRevisionUpdated ? (
            <>
              {i18n.AGAINST_LABEL}
              <EuiBadge color="hollow">{previousRevision}</EuiBadge>
            </>
          ) : null}
          <strong style={{ marginLeft: '0.5em' }}>{i18n.UPDATED_BY_LABEL}</strong>
          {change.username}
          {i18n.ON_DATE_LABEL}
          {moment(change.timestamp).format(DATE_DISPLAY_FORMAT_WITH_SECONDS)}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <strong>{i18n.FIELD_CHANGES_LABEL}</strong>
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
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeFlyout} data-test-subj="changeDetailsFlyoutCancelButton">
              {i18n.CANCEL_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => setIsModalOpen(true)}
              isDisabled={!change.snapshot}
              fill
              data-test-subj="changeDetailsFlyoutRevertButton"
            >
              {i18n.RESTORE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {isModalOpen && (
        <ChangeHistoryConfirmRestoreModal
          ruleId={change.ruleId}
          changeId={change.id}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </EuiFlyout>
  );
};
