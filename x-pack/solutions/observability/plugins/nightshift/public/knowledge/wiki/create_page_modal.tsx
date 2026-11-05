/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getWikiEntityTypeSingularLabel } from './entity_type_labels';
import { WIKI_ENTITY_TYPES, type WikiEntityType } from './types';
import { useCreateWikiPage } from './use_wiki';

const PAGE_TEMPLATE = [
  '## Overview',
  '',
  '_(write a 1-3 sentence summary here)_',
  '',
  '## Established facts',
  '',
  '-',
  '',
  '## Open questions',
  '',
  '-',
  '',
].join('\n');

interface WikiCreatePageModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function WikiCreatePageModal({ onClose, onCreated }: WikiCreatePageModalProps) {
  const titleId = useGeneratedHtmlId();
  const [entityType, setEntityType] = useState<WikiEntityType>('topic');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const { mutate: createPage, isLoading } = useCreateWikiPage();

  const onCreate = () =>
    createPage(
      {
        entity_type: entityType,
        slug,
        title: title.trim(),
        content: PAGE_TEMPLATE,
        status: 'tentative',
      },
      { onSuccess: ({ page }) => onCreated(page.id) }
    );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="nightshiftWikiCreateModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.createModal.title"
            defaultMessage="New Wiki page"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm component="div">
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.knowledge.wiki.createModal.typeLabel', {
              defaultMessage: 'Type',
            })}
          >
            <EuiSelect
              options={WIKI_ENTITY_TYPES.map((value) => ({
                value,
                text: getWikiEntityTypeSingularLabel(value),
              }))}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as WikiEntityType)}
              data-test-subj="nightshiftWikiCreateType"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.knowledge.wiki.createModal.slugLabel', {
              defaultMessage: 'Slug',
            })}
            helpText={i18n.translate('xpack.nightshift.knowledge.wiki.createModal.slugHelp', {
              defaultMessage: 'Lowercase words separated by hyphens, for example {example}.',
              values: { example: 'checkout-latency-p99' },
            })}
          >
            <EuiFieldText
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              data-test-subj="nightshiftWikiCreateSlug"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.knowledge.wiki.createModal.titleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-test-subj="nightshiftWikiCreateTitle"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="significantEventsAppWikiCreatePageModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.createModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onCreate}
          isLoading={isLoading}
          isDisabled={!/[a-z0-9]/i.test(slug) || title.trim().length === 0}
          data-test-subj="nightshiftWikiCreateSubmit"
        >
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.createModal.createButton"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
