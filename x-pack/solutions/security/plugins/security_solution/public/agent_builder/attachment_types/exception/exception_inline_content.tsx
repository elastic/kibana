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
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { toApiEntries } from '../../../../common/detection_engine/rule_exceptions/to_api_entries';
import type { ExceptionAttachment } from './types';

const ValueListText: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

const CONDITIONS_TEST_SUBJ = 'securityExceptionAttachmentConditions';

/**
 * Read-only card for a proposed detection rule exception.
 */
export const ExceptionInlineContent: React.FC<AttachmentRenderProps<ExceptionAttachment>> = ({
  attachment,
}) => {
  const { description, entries, os_types: osTypes } = attachment.data;

  // Exception item card component accepts entries in a format that is returned by the `toApiEntries`.
  const entriesProp = useMemo<EntriesArray | undefined>(() => {
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
      {entriesProp ? (
        <ExceptionItemCardConditions
          entries={entriesProp}
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
