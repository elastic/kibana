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
import { getCortexEntityTypeSingularLabel } from './entity_type_labels';
import { CORTEX_ENTITY_TYPES, type CortexEntityType } from './types';
import { useCreateCortexPage } from './use_cortex';

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

interface CortexCreatePageModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CortexCreatePageModal({ onClose, onCreated }: CortexCreatePageModalProps) {
  const titleId = useGeneratedHtmlId();
  const [entityType, setEntityType] = useState<CortexEntityType>('topic');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const { mutate: createPage, isLoading } = useCreateCortexPage();

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
      data-test-subj="nightshiftCortexCreateModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          <FormattedMessage
            id="xpack.significantEventsApp.cortex.createModal.title"
            defaultMessage="New Cortex page"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm component="div">
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.cortex.createModal.typeLabel', {
              defaultMessage: 'Type',
            })}
          >
            <EuiSelect
              options={CORTEX_ENTITY_TYPES.map((value) => ({
                value,
                text: getCortexEntityTypeSingularLabel(value),
              }))}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as CortexEntityType)}
              data-test-subj="nightshiftCortexCreateType"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.cortex.createModal.slugLabel', {
              defaultMessage: 'Slug',
            })}
            helpText={i18n.translate('xpack.significantEventsApp.cortex.createModal.slugHelp', {
              defaultMessage: 'Lowercase words separated by hyphens, for example {example}.',
              values: { example: 'checkout-latency-p99' },
            })}
          >
            <EuiFieldText
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              data-test-subj="nightshiftCortexCreateSlug"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.significantEventsApp.cortex.createModal.titleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-test-subj="nightshiftCortexCreateTitle"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="significantEventsAppCortexCreatePageModalCancelButton"
          onClick={onClose}
        >
          <FormattedMessage
            id="xpack.significantEventsApp.cortex.createModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onCreate}
          isLoading={isLoading}
          isDisabled={!/[a-z0-9]/i.test(slug) || title.trim().length === 0}
          data-test-subj="nightshiftCortexCreateSubmit"
        >
          <FormattedMessage
            id="xpack.significantEventsApp.cortex.createModal.createButton"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
