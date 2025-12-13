/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  consoleTutorials,
  replaceConsoleTutorialStrings,
  type ConsoleTutorialVariables,
} from '@kbn/search-code-examples';
import {
  SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID,
  ES_SEARCH_PLAYGROUND_ID,
  ENTERPRISE_SEARCH_APPLICATIONS_APP_ID,
} from '@kbn/deeplinks-search';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiImage } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  image: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const ConsoleTutorialsGroup = () => {
  const { application, console: consolePlugin, share } = useKibana().services;
  const assetBasePath = useAssetBasePath();

  // Generate URLs using deeplinks - same way navigation bar does it
  const tutorialVariables = useMemo<ConsoleTutorialVariables>(() => {
    return {
      inference_endpoints_url: application.getUrlForApp(
        SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID,
        {
          deepLinkId: 'inferenceEndpoints',
          absolute: true,
        }
      ),
      search_playground_url: application.getUrlForApp(ES_SEARCH_PLAYGROUND_ID, {
        absolute: true,
      }),
      search_applications_url: application.getUrlForApp(ENTERPRISE_SEARCH_APPLICATIONS_APP_ID, {
        deepLinkId: 'searchApplications',
        absolute: true,
      }),
    };
  }, [application]);
  const tutorials: TutorialMetadata[] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.basicsTitle', {
          defaultMessage: 'Search basics',
        }),
        dataTestSubj: 'console_tutorials_search_basics',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.basicsDescription',
          {
            defaultMessage:
              'Learn how to create an index, add documents, and basic search techniques.',
          }
        ),
        request: replaceConsoleTutorialStrings(consoleTutorials.basics, tutorialVariables),
        image: `${assetBasePath}/search_window_illustration.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.semanticTitle', {
          defaultMessage: 'Intro to semantic search',
        }),
        dataTestSubj: 'console_tutorials_semantic_search',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.semanticDescription',
          {
            defaultMessage:
              'Learn semantic search techniques to understand intent and deliver more accurate, relevant results.',
          }
        ),
        request: consoleTutorials.semanticSearch,
        image: `${assetBasePath}/search_results_illustration.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlTitle', {
          defaultMessage: 'ES|QL fundamentals',
        }),
        dataTestSubj: 'console_tutorials_esql',
        description: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlDescription', {
          defaultMessage:
            "Learn how to use Elastic's piped query language to simplify data investigations.",
        }),
        request: consoleTutorials.esql,
        image: `${assetBasePath}/search_observe_illustration.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
      // TODO:  uncomment below lines when we are ready to show TSDS tutorial. review https://github.com/elastic/kibana/pull/237384#issuecomment-3411670210
      // {
      //   title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsTitle', {
      //     defaultMessage: 'Time series data streams',
      //   }),
      //   dataTestSubj: 'console_tutorials_tsds',
      //   description: i18n.translate('xpack.searchHomepage.consoleTutorials.tsdsDescription', {
      //     defaultMessage:
      //       'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
      //   }),
      //   request: consoleTutorials.timeSeriesDataStreams,
      //   image: null,
      //   buttonRef: useRef<HTMLButtonElement>(null),
      // },
    ],
    [assetBasePath, tutorialVariables]
  );

  return (
    <EuiFlexGroup gutterSize="l" direction={'column'} justifyContent="spaceBetween">
      <SearchGettingStartedSectionHeading
        title={i18n.translate('xpack.searchGettingStarted.consoleTutorials.label', {
          defaultMessage: 'Explore the API',
        })}
        icon={`${assetBasePath}/command_line.svg`}
        description={i18n.translate('xpack.searchGettingStarted.consoleTutorials.description', {
          defaultMessage:
            'Choose a tutorial and use Console to quickly start interacting with the Elasticsearch API.',
        })}
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween">
          {tutorials.map((tutorial) => (
            <EuiFlexItem key={tutorial.dataTestSubj}>
              <EuiCard
                hasBorder
                title={tutorial.title}
                titleSize="xs"
                textAlign="left"
                onClick={() => {
                  tutorial.buttonRef.current?.click();
                }}
                data-test-subj={tutorial.dataTestSubj}
                footer={
                  <TryInConsoleButton
                    type="button"
                    iconType={`${assetBasePath}/command_line.svg`} // TODO: Replace with EUI icon when it's available
                    color="text"
                    request={tutorial.request}
                    application={application}
                    sharePlugin={share}
                    consolePlugin={consolePlugin}
                    telemetryId={tutorial.dataTestSubj}
                    data-test-subj={`${tutorial.dataTestSubj}-btn`}
                    buttonProps={{ buttonRef: tutorial.buttonRef }}
                    content={
                      <FormattedMessage
                        id="xpack.searchGettingStarted.consoleTutorials.runInConsole"
                        defaultMessage="Open in Console"
                      />
                    }
                    onClick={(e) => {
                      // Do not trigger the card click
                      e.stopPropagation();
                    }}
                  />
                }
              >
                <EuiFlexGroup
                  gutterSize="m"
                  alignItems="flexStart"
                  justifyContent="spaceBetween"
                  wrap
                >
                  <EuiFlexItem grow={1}>
                    <EuiFlexGroup
                      gutterSize="s"
                      direction="column"
                      justifyContent="center"
                      alignItems="flexStart"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="relative">{tutorial.description}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiImage
                      src={tutorial.image}
                      alt={`${tutorial.title} tutorial icon`}
                      size="original"
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
