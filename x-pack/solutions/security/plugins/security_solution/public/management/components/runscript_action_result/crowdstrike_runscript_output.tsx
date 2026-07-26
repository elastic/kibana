/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  type EuiTextProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionRunScriptOutputContent,
} from '../../../../common/endpoint/types';

const ACCORDION_BUTTON_TEXT = Object.freeze({
  output: i18n.translate('xpack.securitySolution.crowdstrikeRunscriptAccordion.outputButtonText', {
    defaultMessage: 'Runscript output',
  }),
  error: i18n.translate('xpack.securitySolution.crowdstrikeRunscriptAccordion.errorButtonText', {
    defaultMessage: 'Runscript error',
  }),
});

const NO_OUTPUT_MESSAGE = i18n.translate(
  'xpack.securitySolution.crowdstrikeRunscriptAccordion.noOutputMessage',
  {
    defaultMessage: 'No output was returned for this runscript action.',
  }
);

const styledTextCss = css`
  white-space: pre-wrap;
  line-break: anywhere;
`;

interface CrowdstrikeRunscriptAccordionProps {
  content?: string;
  initialIsOpen?: boolean;
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
  type: 'error' | 'output';
  'data-test-subj'?: string;
}

const CrowdstrikeRunscriptAccordion = memo<CrowdstrikeRunscriptAccordionProps>(
  ({ content, initialIsOpen = false, textSize = 'xs', type, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const id = useGeneratedHtmlId({
      prefix: 'crowdstrikeRunscriptAccordion',
      suffix: type,
    });

    const accordionButtonContent = useMemo(
      () => (
        <EuiText size={textSize} data-test-subj={getTestId('title')}>
          {ACCORDION_BUTTON_TEXT[type]}
        </EuiText>
      ),
      [getTestId, textSize, type]
    );

    return (
      <EuiAccordion
        id={id}
        initialIsOpen={initialIsOpen}
        buttonContent={accordionButtonContent}
        paddingSize="s"
        data-test-subj={dataTestSubj}
      >
        <EuiText size={textSize} css={styledTextCss}>
          <p>{content}</p>
        </EuiText>
      </EuiAccordion>
    );
  }
);
CrowdstrikeRunscriptAccordion.displayName = 'CrowdstrikeRunscriptAccordion';

export interface CrowdstrikeRunscriptOutputProps {
  action: MaybeImmutable<ActionDetails<ResponseActionRunScriptOutputContent>>;
  agentId: string;
  'data-test-subj'?: string;
  textSize?: Exclude<EuiTextProps['size'], 'm' | 'relative'>;
}

export const CrowdstrikeRunscriptOutput = memo<CrowdstrikeRunscriptOutputProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj, textSize = 'xs' }) => {
    const outputContent = useMemo(
      () => action.outputs && action.outputs[agentId] && action.outputs[agentId].content,
      [action.outputs, agentId]
    );

    if (!outputContent) {
      return (
        <EuiFlexItem>
          <EuiText size={textSize} data-test-subj={`${dataTestSubj}-no-output`}>
            {NO_OUTPUT_MESSAGE}
          </EuiText>
        </EuiFlexItem>
      );
    }

    const { stderr, stdout } = outputContent;
    const hasErrorOutput = stderr && stderr.length > 0;
    const hasStdOutput = stdout && stdout.length > 0;

    return (
      <EuiFlexItem>
        {hasErrorOutput && (
          <CrowdstrikeRunscriptAccordion
            content={stderr}
            data-test-subj={`${dataTestSubj}-stderr`}
            initialIsOpen
            textSize={textSize}
            type="error"
          />
        )}
        {hasStdOutput && (
          <>
            {hasErrorOutput && <EuiSpacer size="m" />}
            <CrowdstrikeRunscriptAccordion
              content={stdout}
              data-test-subj={`${dataTestSubj}-stdout`}
              initialIsOpen
              textSize={textSize}
              type="output"
            />
          </>
        )}
      </EuiFlexItem>
    );
  }
);
CrowdstrikeRunscriptOutput.displayName = 'CrowdstrikeRunscriptOutput';
