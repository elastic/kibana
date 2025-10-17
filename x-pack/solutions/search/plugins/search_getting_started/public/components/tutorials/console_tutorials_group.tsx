/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';

interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  duration: number;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const ConsoleTutorialsGroup = () => {
  const { application, console: consolePlugin, share } = useKibana().services;
  const tutorials: TutorialMetadata[] = [
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsTitle', {
        defaultMessage: 'Search basics',
      }),
      dataTestSubj: 'console_tutorials_search_basics',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsDescription', {
        defaultMessage: 'Learn how to create an index, add documents, and basic search techniques.',
      }),
      request: consoleTutorials.basics,
      duration: 3,
      buttonRef: useRef<HTMLButtonElement>(null),
    },
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.semanticTitle', {
        defaultMessage: 'Semantic search',
      }),
      dataTestSubj: 'console_tutorials_semantic_search',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.semanticDescription', {
        defaultMessage:
          'Learn semantic search techniques to understand intent and deliver more accurate, relevant results.',
      }),
      request: consoleTutorials.semanticSearch,
      duration: 3,
      buttonRef: useRef<HTMLButtonElement>(null),
    },
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.esqlTitle', {
        defaultMessage: 'ES|QL',
      }),
      dataTestSubj: 'console_tutorials_esql',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.esqlDescription', {
        defaultMessage:
          "Learn how to use Elastic's piped query language to simplify data investigations.",
      }),
      request: consoleTutorials.esql,
      duration: 4,
      buttonRef: useRef<HTMLButtonElement>(null),
    },
  ];

  return (
    <EuiFlexGroup gutterSize="l" direction={'column'} justifyContent="spaceBetween">
      <EuiFlexGroup gutterSize="xs" direction={'column'} justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <SearchGettingStartedSectionHeading
            title={i18n.translate('xpack.searchHomepage.consoleTutorials.label', {
              defaultMessage: 'Explore the API',
            })}
            icon="console"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.searchHomepage.consoleTutorials.description"
              defaultMessage="Choose a tutorial and use Console to quickly start interacting with the elasticsearch API."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween">
          {tutorials.map((tutorial, index) => (
            <EuiFlexItem key={index}>
              <EuiCard
                hasBorder
                title={tutorial.title}
                titleSize="xs"
                textAlign="left"
                onClick={tutorial.buttonRef.current?.click}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  direction="column"
                  justifyContent="center"
                  alignItems="flexStart"
                >
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      <EuiText size="relative" color="subdued">
                        <FormattedMessage
                          id="xpack.searchHomepage.consoleTutorials.duration"
                          defaultMessage="~{duration} min"
                          values={{ duration: tutorial.duration }}
                        />
                      </EuiText>
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="relative">{tutorial.description}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <TryInConsoleButton
                      type="button"
                      color="text"
                      request={tutorial.request}
                      application={application}
                      sharePlugin={share}
                      consolePlugin={consolePlugin}
                      telemetryId={tutorial.dataTestSubj}
                      data-test-subj={tutorial.dataTestSubj}
                      buttonProps={{ buttonRef: tutorial.buttonRef }}
                      onClick={(e) => {
                        // Do not trigger the card click
                        e.stopPropagation();
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
