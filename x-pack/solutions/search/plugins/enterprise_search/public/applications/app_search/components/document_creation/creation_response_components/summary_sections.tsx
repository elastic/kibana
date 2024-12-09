/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocumentCreationLogic } from '..';

import { ExampleDocumentJson, MoreDocumentsText } from './summary_documents';
import { SummarySectionAccordion, SummarySectionEmpty } from './summary_section';

export const InvalidDocumentsSummary: React.FC = () => {
  const {
    summary: { invalidDocuments },
  } = useValues(DocumentCreationLogic);

  const hasInvalidDocuments = invalidDocuments.total > 0;
  const unshownInvalidDocuments = invalidDocuments.total - invalidDocuments.examples.length;

  return hasInvalidDocuments ? (
    <SummarySectionAccordion
      id="invalidDocuments"
      status="error"
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.invalidDocuments',
        {
          defaultMessage:
            '{invalidDocuments, number} {invalidDocuments, plural, one {document} other {documents}} with errors...',
          values: { invalidDocuments: invalidDocuments.total },
        }
      )}
    >
      {invalidDocuments.examples.map(({ document, errors }, index) => (
        <ExampleDocumentJson document={document} errors={errors} key={index} />
      ))}
      {unshownInvalidDocuments > 0 && <MoreDocumentsText documents={unshownInvalidDocuments} />}
    </SummarySectionAccordion>
  ) : null;
};

export const ValidDocumentsSummary: React.FC = () => {
  const {
    summary: { validDocuments },
  } = useValues(DocumentCreationLogic);

  const hasValidDocuments = validDocuments.total > 0;
  const unshownValidDocuments = validDocuments.total - validDocuments.examples.length;

  return hasValidDocuments ? (
    <SummarySectionAccordion
      id="newDocuments"
      status="success"
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.newDocuments',
        {
          defaultMessage:
            'Added {newDocuments, number} {newDocuments, plural, one {document} other {documents}}.',
          values: { newDocuments: validDocuments.total },
        }
      )}
    >
      {validDocuments.examples.map((document, index) => (
        <ExampleDocumentJson document={document} key={index} />
      ))}
      {unshownValidDocuments > 0 && <MoreDocumentsText documents={unshownValidDocuments} />}
    </SummarySectionAccordion>
  ) : (
    <SummarySectionEmpty
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.noNewDocuments',
        { defaultMessage: 'No new documents.' }
      )}
    />
  );
};

export const SchemaFieldsSummary: React.FC = () => {
  const {
    summary: { newSchemaFields },
  } = useValues(DocumentCreationLogic);

  return newSchemaFields.length ? (
    <SummarySectionAccordion
      id="newSchemaFields"
      status="info"
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.newSchemaFields',
        {
          defaultMessage:
            "Added {newFields, number} {newFields, plural, one {field} other {fields}} to the Engine's schema.",
          values: { newFields: newSchemaFields.length },
        }
      )}
    >
      <EuiFlexGroup wrap responsive={false} gutterSize="s">
        {newSchemaFields.map((schemaField: string) => (
          <EuiFlexItem grow={false} key={schemaField}>
            <EuiBadge>{schemaField}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </SummarySectionAccordion>
  ) : (
    <SummarySectionEmpty
      title={i18n.translate(
        'xpack.enterpriseSearch.appSearch.documentCreation.showSummary.noNewSchemaFields',
        { defaultMessage: 'No new schema fields.' }
      )}
    />
  );
};
