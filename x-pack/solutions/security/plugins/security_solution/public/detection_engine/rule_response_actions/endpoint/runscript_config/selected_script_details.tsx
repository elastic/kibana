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

    const listItems: EuiDescriptionListProps['listItems'] = useMemo(() => {
      return [
        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.descriptionLabel"
              defaultMessage="Description"
            />
          ),
          description: <FormattedContent>{script.description || getEmptyValue()}</FormattedContent>,
        },

        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.instructionsLabel"
              defaultMessage="Instructions"
            />
          ),
          description: (
            <FormattedContent>{script.instructions || getEmptyValue()}</FormattedContent>
          ),
        },

        {
          title: (
            <FormattedMessage
              id="xpack.securitySolution.runscriptConfigSelectedScript.examplesLabel"
              defaultMessage="Examples"
            />
          ),
          description: <FormattedContent>{script.example || getEmptyValue()}</FormattedContent>,
        },
      ];
    }, [script.description, script.example, script.instructions]);

    return (
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder={true}>
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
      </EuiPanel>
    );
  }
);
SelectedScriptDetails.displayName = 'SelectedScriptDetails';

interface FormattedContentProps {
  children: React.ReactNode;
}

const FormattedContent = memo<FormattedContentProps>(({ children }) => {
  return (
    <EuiText size="s" className="eui-textBreakAll" css={formattedContentCss}>
      {children}
    </EuiText>
  );
});
FormattedContent.displayName = 'FormattedContent';
