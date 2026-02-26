/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiImage,
  EuiFlexGrid,
  EuiButtonEmpty,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { orderBy } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { isNew } from '../../common/utils';
interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  image: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
  publishedAt: Date;
}
const EXPAND_LIMIT = 3;

export const ConsoleTutorialsGroup = () => {
  const { application, console: consolePlugin, share } = useKibana().services;
  const assetBasePath = useAssetBasePath();
  const isMediumBreakpoint = useIsWithinMaxBreakpoint('m');
  const isSmallBreakpoint = useIsWithinMaxBreakpoint('s');
  const tutorialColumns = isSmallBreakpoint ? 1 : isMediumBreakpoint ? 2 : 3;
  const [expanded, setExpanded] = useState(false);
  const toggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const tutorials: TutorialMetadata[] = useMemo(() => {
    const items = [
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
        request: consoleTutorials.basics,
        image: `${assetBasePath}/search_window_illustration.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
        publishedAt: new Date('2025-10-31'),
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
        publishedAt: new Date('2025-10-31'),
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
        publishedAt: new Date('2025-10-31'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.agentBuilderTitle', {
          defaultMessage: 'Agent builder',
        }),
        dataTestSubj: 'console_tutorials_agent_builder',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.agentBuilderDescription',
          {
            defaultMessage: 'Learn how to use the Agent Builder APIs to create and manage agents.',
          }
        ),
        request: consoleTutorials.agentBuilder,
        image: `${assetBasePath}/search_task_automation.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
        publishedAt: new Date('2026-02-18'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsTitle', {
          defaultMessage: 'Time series data streams',
        }),
        dataTestSubj: 'console_tutorials_tsds',
        description: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsDescription', {
          defaultMessage:
            'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
        }),
        request: consoleTutorials.timeSeriesDataStreams,
        image: `${assetBasePath}/search_hourglass.svg`,
        buttonRef: React.createRef<HTMLButtonElement>(),
        publishedAt: new Date('2026-02-04'),
      },
    ];
    return orderBy(items, ({ publishedAt }) => publishedAt.getTime(), ['desc']).slice(
      0,
      expanded ? undefined : EXPAND_LIMIT
    );
  }, [assetBasePath, expanded]);

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
      <EuiFlexGrid gutterSize="l" columns={tutorialColumns}>
        {tutorials.map((tutorial) => (
          <EuiFlexItem key={tutorial.dataTestSubj}>
            <EuiCard
              hasBorder
              title={tutorial.title}
              betaBadgeProps={{
                label: isNew(tutorial.publishedAt)
                  ? i18n.translate('xpack.searchGettingStarted.consoleTutorials.badge', {
                      defaultMessage: 'New',
                    })
                  : '',
                color: 'accent',
              }}
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
      </EuiFlexGrid>
      <EuiFlexItem
        css={css`
          align-items: center;
        `}
      >
        <EuiButtonEmpty
          data-test-subj="searchGettingStartedConsoleTutorialsGroupExpandButton"
          color="text"
          onClick={toggleExpand}
        >
          {expanded ? (
            <FormattedMessage
              id="xpack.searchGettingStarted.consoleTutorials.showLess"
              defaultMessage="Show less"
            />
          ) : (
            <FormattedMessage
              id="xpack.searchGettingStarted.consoleTutorials.showMore"
              defaultMessage="Show more"
            />
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
