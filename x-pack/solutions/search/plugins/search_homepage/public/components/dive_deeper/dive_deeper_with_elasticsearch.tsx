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
            defaultMessage: 'Dive Deeper with Elasticsearch',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        <EuiFlexItem>
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.searchLabs.title', {
              defaultMessage: 'Search Labs',
            })}
            description={i18n.translate('xpack.searchHomepage.searchLabs.description', {
              defaultMessage:
                'Explore the latest articles and tutorials on using Elasticsearch for AI/ML-powered search experiences.',
            })}
            buttonHref={docLinks.visitSearchLabs}
            buttonLabel={i18n.translate('xpack.searchHomepage.searchLabs.buttonText', {
              defaultMessage: 'Visit Search Labs',
            })}
            dataTestSubj="searchLabsButton"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.pythonNotebooks.title', {
              defaultMessage: 'Python notebooks',
            })}
            description={i18n.translate('xpack.searchHomepage.pythonNotebooks.description', {
              defaultMessage:
                'Test features in a virtual environment with executable notebooks.',
            })}
            buttonHref={docLinks.notebooksExamples}
            buttonLabel={i18n.translate('xpack.searchHomepage.pythonNotebooks.buttonText', {
              defaultMessage: 'Open notebooks',
            })}
            dataTestSubj="openNotebooksButton"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.searchLabs.title', {
              defaultMessage: 'Search Labs',
            })}
            description={i18n.translate(
              'xpack.searchHomepage.elasticsearchDocumentation.description',
              {
                defaultMessage:
                  'Learn about Elasticsearch APIs, query languages, and common use cases.',
              }
            )}
            buttonHref={docLinks.elasticsearchGettingStarted}
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
