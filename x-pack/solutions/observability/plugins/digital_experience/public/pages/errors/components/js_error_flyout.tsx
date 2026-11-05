/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { PlaintextStacktrace } from '@kbn/event-stacktrace';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { JsErrorGroup } from '../../../../common/types/errors';
import { ERRORS_EBT_ELEMENTS, DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import { LAST_SEEN_LABEL, OCCURRENCES_LABEL } from '../../../labels';

const NO_STACKTRACE_TITLE = i18n.translate('xpack.digitalExperience.errors.flyout.noStacktrace', {
  defaultMessage: 'These errors have no stack trace',
});

const SESSIONS_WITH_ERRORS_LABEL = i18n.translate(
  'xpack.digitalExperience.errors.flyout.sessionsWithErrors',
  { defaultMessage: 'View sessions with errors' }
);

/** The stack trace of an error group, or its message under a note when it has none. */
function ErrorStacktrace({ type, message, stacktrace }: JsErrorGroup) {
  if (stacktrace === null) {
    return (
      <KbnInfoCallout size="s" title={NO_STACKTRACE_TITLE}>
        {message}
      </KbnInfoCallout>
    );
  }
  // `PlaintextStacktrace` takes no `data-test-subj`.
  return (
    <div data-test-subj="digitalExperienceErrorStacktrace">
      <PlaintextStacktrace type={type} message={message ?? undefined} stacktrace={stacktrace} />
    </div>
  );
}

/** One error group: its counts and its stack trace, with a way to the sessions with errors. */
export function JsErrorFlyout({
  error,
  sessionsWithErrorsHref,
  onClose,
}: {
  error: JsErrorGroup;
  sessionsWithErrorsHref: string;
  onClose: () => void;
}) {
  const { formatNumber, formatDate } = useFormatters();
  const titleId = useGeneratedHtmlId({ prefix: 'digitalExperienceJsErrorFlyoutTitle' });
  const { type, count, lastSeen } = error;
  const details = [
    { title: OCCURRENCES_LABEL, description: formatNumber(count) },
    ...(lastSeen ? [{ title: LAST_SEEN_LABEL, description: formatDate(lastSeen) }] : []),
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="digitalExperienceErrorFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{type}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList type="column" compressed listItems={details} />
        <EuiSpacer size="l" />
        <ErrorStacktrace {...error} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButton
            href={sessionsWithErrorsHref}
            iconType="table"
            data-test-subj="digitalExperienceErrorSessionsLink"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSIONS,
              element: ERRORS_EBT_ELEMENTS.SESSIONS_LINK,
            })}
          >
            {SESSIONS_WITH_ERRORS_LABEL}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
