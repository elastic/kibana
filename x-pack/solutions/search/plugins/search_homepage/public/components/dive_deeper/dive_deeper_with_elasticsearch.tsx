/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../../common/doc_links';
import { DocCallouts } from './doc_callouts';

export const DiveDeeperWithElasticsearch: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.searchHomepage.diveDeeper.title', {
            defaultMessage: 'Dive deeper with Elasticsearch',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        <EuiFlexItem data-test-subj="searchLabsSection">
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.searchLabs.title', {
              defaultMessage: 'Elasticsearch Labs',
            })}
            description={i18n.translate('xpack.searchHomepage.searchLabs.description', {
              defaultMessage: 'Explore the latest innovations for advanced search experiences.',
            })}
            buttonHref={docLinks.visitSearchLabs}
            buttonLabel={i18n.translate('xpack.searchHomepage.searchLabs.buttonText', {
              defaultMessage: 'Visit Elasticsearch Labs',
            })}
            dataTestSubj="searchLabsButton"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="pythonNotebooksSection">
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.pythonNotebooks.title', {
              defaultMessage: 'Python notebooks',
            })}
            description={i18n.translate('xpack.searchHomepage.pythonNotebooks.description', {
              defaultMessage: 'Test features in a virtual environment with executable notebooks.',
            })}
            buttonHref={docLinks.notebooksExamples}
            buttonLabel={i18n.translate('xpack.searchHomepage.pythonNotebooks.buttonText', {
              defaultMessage: 'Open notebooks',
            })}
            dataTestSubj="openNotebooksButton"
          />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="elasticsearchDocumentationSection">
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.elasticsearchDocs.title', {
              defaultMessage: 'Elasticsearch documentation',
            })}
            description={i18n.translate(
              'xpack.searchHomepage.elasticsearchDocumentation.description',
              {
                defaultMessage:
                  'Learn about Elasticsearch APIs, query languages, and common use cases.',
              }
            )}
            buttonHref={docLinks.elasticsearchDocs}
            buttonLabel={i18n.translate(
              'xpack.searchHomepage.elasticsearchDocumentation.buttonText',
              {
                defaultMessage: 'View documentation',
              }
            )}
            dataTestSubj="viewDocumentationButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
