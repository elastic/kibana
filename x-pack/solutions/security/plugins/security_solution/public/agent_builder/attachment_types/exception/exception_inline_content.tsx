/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { ExceptionItemCardConditions } from '@kbn/securitysolution-exception-list-components';
import { toApiEntries } from '@kbn/securitysolution-exceptions-common/workflows';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionAttachment } from './types';

/**
 * `ExceptionItemCardConditions` links value-list conditions to a modal that
 * needs the Security Solution Kibana context, which chat does not provide, so
 * value lists render as plain text here. The proposals this attachment carries
 * use field conditions, not value lists.
 */
const ValueListText: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

const CONDITIONS_TEST_SUBJ = 'securityExceptionAttachmentConditions';

/**
 * Read-only card for a proposed detection rule exception. Renders the same
 * condition list as the exceptions UI so an analyst reading a proposal in chat
 * sees it exactly as they would in the Detection Rules UI.
 */
export const ExceptionInlineContent: React.FC<AttachmentRenderProps<ExceptionAttachment>> = ({
  attachment,
}) => {
  const { description, entries, os_types: osTypes } = attachment.data;

  const apiEntries = useMemo<EntriesArray | undefined>(() => {
    try {
      return toApiEntries(entries);
    } catch (error) {
      return undefined;
    }
  }, [entries]);

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      {description ? (
        <>
          <EuiText size="s">{description}</EuiText>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {apiEntries ? (
        <ExceptionItemCardConditions
          entries={apiEntries}
          os={osTypes}
          dataTestSubj={CONDITIONS_TEST_SUBJ}
          showValueListModal={ValueListText}
        />
      ) : (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          size="s"
          data-test-subj="securityExceptionAttachmentInvalidEntries"
          title={i18n.translate(
            'xpack.securitySolution.agentBuilder.exceptionAttachment.invalidEntriesTitle',
            { defaultMessage: 'This exception proposal cannot be displayed' }
          )}
        >
          {i18n.translate(
            'xpack.securitySolution.agentBuilder.exceptionAttachment.invalidEntriesBody',
            {
              defaultMessage:
                'Its conditions are incomplete. Ask the assistant to propose the exception again.',
            }
          )}
        </EuiCallOut>
      )}
    </EuiPanel>
  );
};
