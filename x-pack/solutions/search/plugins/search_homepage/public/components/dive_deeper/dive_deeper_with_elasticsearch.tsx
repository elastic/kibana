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
  EuiButton,
  EuiText,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { docLinks } from '../../../common/doc_links';

interface DocCalloutsProps {
  title: string;
  description: string;
  buttonHref: string;
  buttonLabel: string;
  buttonTelem: string;
}

const DocCallouts = ({
  title,
  description,
  buttonHref,
  buttonLabel,
  buttonTelem,
}: DocCalloutsProps) => {
  return (
    <>
      <EuiTitle size="s">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <span>
        <EuiButton
          iconType={'popout'}
          href={buttonHref}
          iconSide="right"
          data-test-subj={buttonTelem}
          color="text"
        >
          {buttonLabel}
        </EuiButton>
      </span>
    </>
  );
};

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
            buttonTelem="searchLabsButton"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DocCallouts
            title={i18n.translate('xpack.searchHomepage.pythonNotebooks.title', {
              defaultMessage: 'Python notebooks',
            })}
            description={i18n.translate('xpack.searchHomepage.pythonNotebooks.description', {
              defaultMessage:
                'A range of executable Python notebooks available to easily test features in a virtual environment.',
            })}
            buttonHref={docLinks.notebooksExamples}
            buttonLabel={i18n.translate('xpack.searchHomepage.pythonNotebooks.buttonText', {
              defaultMessage: 'Open notebooks',
            })}
            buttonTelem="openNotebooksButton"
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
                  'A range of executable Python notebooks available to easily test features in a virtual environment.',
              }
            )}
            buttonHref={docLinks.elasticsearchGettingStarted}
            buttonLabel={i18n.translate(
              'xpack.searchHomepage.elasticsearchDocumentation.buttonText',
              {
                defaultMessage: 'View Documentation',
              }
            )}
            buttonTelem="viewDocumentationButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
