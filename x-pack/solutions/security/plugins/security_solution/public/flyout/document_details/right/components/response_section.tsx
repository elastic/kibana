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
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ResponseButton } from './response_button';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

const KEY = 'response';

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection = memo(() => {
  const { isRulePreview, getFieldsData } = useDocumentDetailsContext();

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });
  const eventKind = getField(getFieldsData('event.kind'));

  const content = useMemo(() => {
    if (isRulePreview) {
      return (
        <EuiCallOut
          announceOnMount
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

    return <ResponseButton />;
  }, [isRulePreview]);

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
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      data-test-subj={RESPONSE_SECTION_TEST_ID}
    >
      {content}
    </ExpandableSection>
  );
});

ResponseSection.displayName = 'ResponseSection';
