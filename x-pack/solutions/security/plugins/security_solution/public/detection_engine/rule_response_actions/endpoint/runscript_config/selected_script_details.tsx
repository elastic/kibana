/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiSpacer,
  EuiAccordion,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { SELECTED_SCRIPT_DETAILS_LABEL } from './translations';
import type { EndpointScript } from '../../../../../common/endpoint/types';

const formattedContentCss = css`
  white-space: pre-wrap;
`;

const accordionCss = css`
  .triggerButton,
  .triggerButton > * {
    padding: 0 !important;
  }
`;

export interface SelectedScriptDetailsProps {
  script: EndpointScript;
  'data-test-subj'?: string;
}

export const SelectedScriptDetails = memo<SelectedScriptDetailsProps>(
  ({ script, 'data-test-subj': dataTestSubj }) => {
    const accordionId = useGeneratedHtmlId({ prefix: 'selectedScript' });
    const getTestId = useTestIdGenerator(dataTestSubj);

    const listItems: EuiDescriptionListProps['listItems'] = useMemo(() => {
      return [
        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.descriptionLabel"
              defaultMessage="Description"
            />
          ),
          description: (
            <FormattedContent data-test-subj={getTestId('description')}>
              {script.description || getEmptyValue()}
            </FormattedContent>
          ),
        },

        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.instructionsLabel"
              defaultMessage="Instructions"
            />
          ),
          description: (
            <FormattedContent data-test-subj={getTestId('instructions')}>
              {script.instructions || getEmptyValue()}
            </FormattedContent>
          ),
        },

        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.examplesLabel"
              defaultMessage="Examples"
            />
          ),
          description: (
            <FormattedContent data-test-subj={getTestId('example')}>
              {script.example || getEmptyValue()}
            </FormattedContent>
          ),
        },
      ];
    }, [script.description, script.example, script.instructions, getTestId]);

    return (
      <EuiAccordion
        id={accordionId}
        buttonContent={SELECTED_SCRIPT_DETAILS_LABEL}
        buttonClassName="triggerButton"
        buttonProps={{ paddingSize: 's' }}
        css={accordionCss}
        data-test-subj={dataTestSubj}
      >
        <EuiHorizontalRule margin="xs" />
        <EuiPanel color="transparent" paddingSize="none">
          <EuiSpacer size="s" />
          <EuiText size="s">
            <EuiDescriptionList listItems={listItems} rowGutterSize="m" />
          </EuiText>
          <EuiSpacer size="s" />
        </EuiPanel>
      </EuiAccordion>
    );
  }
);
SelectedScriptDetails.displayName = 'SelectedScriptDetails';

interface FormattedContentProps {
  children: React.ReactNode;
  'data-test-subj'?: string;
}

const FormattedContent = memo<FormattedContentProps>(
  ({ children, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiText
        size="s"
        className="eui-textBreakAll"
        css={formattedContentCss}
        data-test-subj={dataTestSubj}
      >
        {children}
      </EuiText>
    );
  }
);
FormattedContent.displayName = 'FormattedContent';
