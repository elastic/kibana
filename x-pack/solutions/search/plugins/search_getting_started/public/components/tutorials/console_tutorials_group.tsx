/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { sortBy } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';

interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  icon: string;
  isNew?: boolean;
}

export const ConsoleTutorialsGroup = () => {
  const { console: consolePlugin } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isSmallBreakpoint = useIsWithinBreakpoints(['s']);
  const tutorialColumns = isSmallBreakpoint ? 1 : isMediumBreakpoint ? 2 : 3;

  // Restrict tutorials to load only in the embedded console for now.
  // The TryInConsole component is not used for these elements. Revisit this implementation
  //  if there is a need to open them in the dev tools console page.
  const openConsole = useCallback(
    (request: string) =>
      consolePlugin?.openEmbeddedConsole && consolePlugin.openEmbeddedConsole(request),
    [consolePlugin]
  );

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
        request: consoleTutorials.basics,
        icon: 'search',
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
        icon: 'bullseye',
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
        icon: 'console',
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsTitle', {
          defaultMessage: 'Time series data streams',
        }),
        dataTestSubj: 'console_tutorials_tsds',
        description: i18n.translate('xpack.searchHomepage.consoleTutorials.tsdsDescription', {
          defaultMessage:
            'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
        }),
        request: consoleTutorials.timeSeriesDataStreams,
        icon: 'clock',
        isNew: true,
      },
    ],
    []
  );

  const tutorialCardStyles = css`
    cursor: pointer;
    .tutorialIcon {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      border-radius: ${euiTheme.border.radius.small};
      border: 1px solid transparent;
      padding: ${euiTheme.size.base};
    }
    &:hover {
      color: ${euiTheme.colors.textPrimary};
      .tutorialTitle {
        color: inherit;
      }
      .tutorialDescription {
        color: ${euiTheme.colors.textParagraph};
      }
      .tutorialIcon {
        border: 1px solid ${euiTheme.colors.borderBasePrimary};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        color: inherit;
      }
    }
  `;

  return (
    <EuiFlexGroup gutterSize="l" direction="column" justifyContent="spaceBetween">
      <SearchGettingStartedSectionHeading
        title={i18n.translate('xpack.searchGettingStarted.consoleTutorials.label', {
          defaultMessage: 'Learn the API with step-by-step tutorials in Console',
        })}
        icon="commandLine"
      />
      <EuiFlexGrid columns={tutorialColumns}>
        {sortBy(tutorials, 'isNew').map((tutorial) => (
          <EuiFlexGroup
            gutterSize="m"
            alignItems="flexStart"
            responsive={false}
            key={tutorial.dataTestSubj}
            css={tutorialCardStyles}
            data-test-subj={`${tutorial.dataTestSubj}-btn`}
            data-telemetry-id={tutorial.dataTestSubj}
            onClick={() => openConsole(tutorial.request)}
          >
            {/* Icon */}
            <EuiFlexItem className="tutorialIcon" grow={false}>
              <EuiIcon type={tutorial.icon} size="l" />
            </EuiFlexItem>
            {/* Badge, title and description */}
            <EuiFlexGroup gutterSize="xs" direction="column">
              <EuiFlexGroup alignItems="center" responsive={false}>
                {tutorial.isNew && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="accent">
                      {i18n.translate('xpack.searchGettingStarted.consoleTutorials.newBadge', {
                        defaultMessage: 'New',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiTitle size="xs" className="tutorialTitle">
                  <h4>{tutorial.title}</h4>
                </EuiTitle>
              </EuiFlexGroup>
              <EuiText size="s" className="tutorialDescription" color="subdued">
                {tutorial.description}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexGroup>
        ))}
      </EuiFlexGrid>
    </EuiFlexGroup>
  );
};
