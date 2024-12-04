/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useExpandSection } from '../hooks/use_expand_section';
import { ResponseButton } from './response_button';
import { ExpandableSection } from './expandable_section';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';

const KEY = 'response';

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection = memo(() => {
  const { isPreview, getFieldsData, isPreviewMode } = useDocumentDetailsContext();

  const expanded = useExpandSection({ title: KEY, defaultValue: false });
  const eventKind = getField(getFieldsData('event.kind'));

  const content = useMemo(() => {
    if (isPreview) {
      return (
        <EuiCallOut
          iconType="documentation"
          size="s"
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.response.previewTitle"
              defaultMessage="Response actions"
            />
          }
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.response.previewAriaLabel',
            { defaultMessage: 'Response actions' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.response.previewMessage"
            defaultMessage="Response is not available in alert preview."
          />
        </EuiCallOut>
      );
    }

    if (isPreviewMode) {
      return (
        <EuiCallOut
          iconType="documentation"
          size="s"
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.response.openFlyoutTitle"
              defaultMessage="Response actions"
            />
          }
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.response.openFlyoutAriaLabel',
            { defaultMessage: 'Response actions' }
          )}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.response.openFlyoutMessage"
            defaultMessage="Open alert details to access response actions."
          />
        </EuiCallOut>
      );
    }

    return <ResponseButton />;
  }, [isPreview, isPreviewMode]);

  if (eventKind !== EventKind.signal) {
    return null;
  }

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.response.sectionTitle"
          defaultMessage="Response"
        />
      }
      localStorageKey={KEY}
      data-test-subj={RESPONSE_SECTION_TEST_ID}
    >
      {content}
    </ExpandableSection>
  );
});

ResponseSection.displayName = 'ResponseSection';
