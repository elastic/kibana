/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiResizeObserver,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import type { PropsWithChildren } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { css } from '@emotion/css';
import { RuleAboutSection } from '../../../rule_management/components/rule_details/rule_about_section';
import { HeaderSection } from '../../../../common/components/header_section';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';
import type { AboutStepRule, AboutStepRuleDetails } from '../../../common/types';
import * as i18n from './translations';
import { fullHeight } from './styles';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { RuleFieldName } from '../../../rule_management/components/rule_details/rule_field_name';

const detailsOption: EuiButtonGroupOptionProps = {
  id: 'details',
  label: i18n.ABOUT_PANEL_DETAILS_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-details',
};
const notesOption: EuiButtonGroupOptionProps = {
  id: 'notes',
  label: i18n.ABOUT_PANEL_NOTES_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-notes',
};
const setupOption: EuiButtonGroupOptionProps = {
  id: 'setup',
  label: i18n.ABOUT_PANEL_SETUP_TAB,
  'data-test-subj': 'stepAboutDetailsToggle-setup',
};
interface StepPanelProps {
  stepData: AboutStepRule | null;
  stepDataDetails: AboutStepRuleDetails | null;
  loading: boolean;
  rule: RuleResponse;
}

const StepAboutRuleToggleDetailsComponent: React.FC<StepPanelProps> = ({
  stepData,
  stepDataDetails,
  loading,
  rule,
}) => {
  const [selectedToggleOption, setToggleOption] = useState('details');
  const [aboutPanelHeight, setAboutPanelHeight] = useState(0);

  const onResize = useCallback(
    (e: { height: number; width: number }) => {
      setAboutPanelHeight(e.height);
    },
    [setAboutPanelHeight]
  );

  const toggleOptions: EuiButtonGroupOptionProps[] = useMemo(() => {
    const notesExist = !isEmpty(stepDataDetails?.note) && stepDataDetails?.note.trim() !== '';
    const setupExists = !isEmpty(stepDataDetails?.setup) && stepDataDetails?.setup.trim() !== '';
    return [
      ...(notesExist || setupExists ? [detailsOption] : []),
      ...(notesExist ? [notesOption] : []),
      ...(setupExists ? [setupOption] : []),
    ];
  }, [stepDataDetails?.note, stepDataDetails?.setup]);

  return (
    <EuiPanel
      hasBorder
      className={css`
        position: relative;
      `}
    >
      {loading && (
        <>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <HeaderSection title={i18n.ABOUT_TEXT} border hideSubtitle />
        </>
      )}
      {stepData != null && stepDataDetails != null && (
        <EuiFlexGroup gutterSize="xs" direction="column" className={fullHeight}>
          <EuiFlexItem grow={false} key="header">
            <HeaderSection title={i18n.ABOUT_TEXT} border hideSubtitle>
              {toggleOptions.length > 0 && (
                <EuiButtonGroup
                  options={toggleOptions}
                  idSelected={selectedToggleOption}
                  onChange={(val) => {
                    setToggleOption(val);
                  }}
                  data-test-subj="stepAboutDetailsToggle"
                  legend={i18n.ABOUT_CONTROL_LEGEND}
                />
              )}
            </HeaderSection>
          </EuiFlexItem>
          <EuiFlexItem key="details">
            {selectedToggleOption === 'details' && (
              <EuiResizeObserver data-test-subj="stepAboutDetailsContent" onResize={onResize}>
                {(resizeRef) => (
                  <div ref={resizeRef} className={fullHeight}>
                    <VerticalOverflowContainer maxHeight={120}>
                      <OverflowContent maxHeight={120}>
                        <RuleDescription description={stepDataDetails.description} />
                      </OverflowContent>
                    </VerticalOverflowContainer>
                    <EuiSpacer size="m" />
                    <RuleAboutSection rule={rule} hideName hideDescription />
                  </div>
                )}
              </EuiResizeObserver>
            )}
            {selectedToggleOption === 'notes' && (
              <VerticalOverflowContainer maxHeight={aboutPanelHeight}>
                <OverflowContent maxHeight={aboutPanelHeight}>
                  <RuleInvestigationGuide note={stepDataDetails.note} />
                </OverflowContent>
              </VerticalOverflowContainer>
            )}
            {selectedToggleOption === 'setup' && (
              <VerticalOverflowContainer maxHeight={aboutPanelHeight}>
                <OverflowContent maxHeight={aboutPanelHeight}>
                  <RuleSetupGuide setup={stepDataDetails.setup} />
                </OverflowContent>
              </VerticalOverflowContainer>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const StepAboutRuleToggleDetails = memo(StepAboutRuleToggleDetailsComponent);

interface VerticalOverflowContainerProps {
  maxHeight: number;
}

function VerticalOverflowContainer({
  maxHeight,
  children,
}: PropsWithChildren<VerticalOverflowContainerProps>): JSX.Element {
  return (
    <div
      className={css`
        max-height: ${maxHeight}px;
        overflow-y: hidden;
        word-break: break-word;
      `}
    >
      {children}
    </div>
  );
}

interface OverflowContentProps {
  maxHeight: number;
}

function OverflowContent({
  maxHeight,
  children,
}: PropsWithChildren<OverflowContentProps>): JSX.Element {
  return (
    <div
      className={`eui-yScroll eui-xScroll ${css`
        max-height: ${maxHeight}px;
      `}`}
    >
      {children}
    </div>
  );
}

const RuleDescription = ({ description }: { description: string }) => (
  <EuiDescriptionList
    listItems={[
      {
        title: <RuleFieldName label={i18n.ABOUT_PANEL_DESCRIPTION_LABEL} fieldName="description" />,
        description: (
          <EuiText size="s" data-test-subj="stepAboutRuleDetailsToggleDescriptionText">
            {description}
          </EuiText>
        ),
      },
    ]}
  />
);

const RuleInvestigationGuide = ({ note }: { note: string }) => (
  <EuiDescriptionList
    listItems={[
      {
        title: <RuleFieldName fieldName="note" />,
        description: <MarkdownRenderer>{note}</MarkdownRenderer>,
      },
    ]}
    descriptionProps={{ 'data-test-subj': 'stepAboutDetailsNoteContent' }}
  />
);

const RuleSetupGuide = ({ setup }: { setup: string }) => (
  <EuiDescriptionList
    listItems={[
      {
        title: <RuleFieldName fieldName="setup" />,
        description: <MarkdownRenderer>{setup}</MarkdownRenderer>,
      },
    ]}
    descriptionProps={{ 'data-test-subj': 'stepAboutDetailsSetupContent' }}
  />
);
