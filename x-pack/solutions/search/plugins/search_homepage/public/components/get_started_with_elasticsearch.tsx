/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { SEARCH_INDICES, SEARCH_INDICES_CREATE_INDEX } from '@kbn/deeplinks-search/constants';
import {
  EuiBadge,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiFlexGrid,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';
import { useUserPrivilegesQuery } from '../hooks/api/use_user_permissions';
import { generateRandomIndexName } from '../utils/indices';
import { SampleDataActionButton } from './sample_data_action_button';

interface GettingStartedCardMetadata {
  title: string | NonNullable<React.ReactNode>;
  dataTestSubj: string;
  description: string | React.ReactNode;
  buttonComponent: React.ReactNode;
  badgeText?: string;
  conditionalCheck?: () => boolean;
  request?: string; // For legacy tutorial support
}

interface GettingStartedCardsProps {
  cards: GettingStartedCardMetadata[];
  hoveredCard: string | null;
  onCardHover: (cardId: string | null) => void;
}

const GettingStartedCards: React.FC<GettingStartedCardsProps> = ({
  cards,
  hoveredCard,
  onCardHover,
}) => {
  const filteredCards = cards.filter((card) => {
    if (card.conditionalCheck) {
      return card.conditionalCheck();
    }
    return true;
  });

  return (
    <>
      {filteredCards.map((card) => (
        <EuiFlexItem key={card.dataTestSubj}>
          <EuiCard
            hasBorder={hoveredCard === card.dataTestSubj}
            display={hoveredCard === card.dataTestSubj ? 'plain' : 'subdued'}
            onMouseEnter={() => onCardHover(card.dataTestSubj)}
            onMouseLeave={() => onCardHover(null)}
            paddingSize="s"
            textAlign="left"
            titleSize="xs"
            data-test-subj={card.dataTestSubj}
            title={
              card.badgeText !== undefined ? (
                <EuiFlexGroup>
                  <EuiFlexItem>{card.title}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <span>
                      <EuiBadge color="subdued">{card.badgeText}</EuiBadge>
                    </span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                card.title
              )
            }
          >
            <EuiFlexGroup
              gutterSize="s"
              direction="column"
              justifyContent="center"
              alignItems="flexStart"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="relative">{card.description}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>{card.buttonComponent}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiCard>
        </EuiFlexItem>
      ))}
    </>
  );
};

export const GetStartedWithElasticsearch = () => {
  const {
    application,
    share,
    console: consolePlugin,
    sampleDataIngest,
    chrome,
  } = useKibana().services;
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const onFileUpload = useCallback(() => {
    application.navigateToApp('ml', { path: 'filedatavisualizer' });
  }, [application]);

  const onCreateIndex = useCallback(() => {
    const createIndexUrl = chrome?.navLinks.get(
      `${SEARCH_INDICES}:${SEARCH_INDICES_CREATE_INDEX}`
    )?.url;

    if (createIndexUrl) {
      application?.navigateToUrl(createIndexUrl);
    }
  }, [application, chrome]);

  const indexName = useMemo(() => generateRandomIndexName(), []);
  const { data: userPrivileges } = useUserPrivilegesQuery(indexName);

  const gettingStartedCards: GettingStartedCardMetadata[] = [
    // Upload file card
    {
      title: i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileTitle', {
        defaultMessage: 'Upload a file',
      }),
      dataTestSubj: 'uploadFileButton',
      description: (
        <FormattedMessage
          id="xpack.searchHomepage.connectToElasticsearch.uploadFileDescription"
          defaultMessage="Analyze and import data from a file."
        />
      ),
      buttonComponent: (
        <EuiButton
          onClick={onFileUpload}
          color="text"
          size="s"
          iconType="export"
          data-test-subj="uploadFileButton"
        >
          {i18n.translate('xpack.searchHomepage.connectToElasticsearch.uploadFileButton', {
            defaultMessage: 'Upload a file',
          })}
        </EuiButton>
      ),
    },
    // Sample data card (conditional)
    {
      title: (
        <FormattedMessage
          id="xpack.searchHomepage.connectToElasticsearch.sampleDatasetTitle"
          defaultMessage="Add sample data"
        />
      ),
      dataTestSubj: 'sampleDataSection',
      description: (
        <FormattedMessage
          id="xpack.searchHomepage.connectToElasticsearch.sampleDataDescription"
          defaultMessage="Start with pre-built data sets, including sample visualizations, dashboards, and more."
        />
      ),
      buttonComponent: <SampleDataActionButton />,
      conditionalCheck: () =>
        sampleDataIngest !== undefined && userPrivileges?.privileges?.canManageIndex === true,
    },
    // Create index card
    {
      title: i18n.translate('xpack.searchHomepage.createIndexTitle', {
        defaultMessage: 'Create an index',
      }),
      dataTestSubj: 'gettingStartedCreateIndexButton',
      description: (
        <FormattedMessage
          id="xpack.searchHomepage.createIndexDescription"
          defaultMessage="Create an index to store your data."
        />
      ),
      buttonComponent: (
        <EuiButton
          onClick={onCreateIndex}
          color="text"
          size="s"
          iconType="plusInCircle"
          data-test-subj="createIndexButton"
        >
          {i18n.translate('xpack.searchHomepage.createIndexButton', {
            defaultMessage: 'Create an index',
          })}
        </EuiButton>
      ),
    },
    // Tutorial cards
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsTitle', {
        defaultMessage: 'Search basics',
      }),
      dataTestSubj: 'console_tutorials_search_basics',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsDescription', {
        defaultMessage: 'Learn how to create an index, add documents, and basic search techniques.',
      }),
      buttonComponent: (
        <TryInConsoleButton
          request={consoleTutorials.basics}
          color="text"
          type="button"
          application={application}
          consolePlugin={consolePlugin}
          sharePlugin={share}
          telemetryId="console_tutorials_search_basics"
          data-test-subj="console_tutorials_search_basics"
        />
      ),
      badgeText: i18n.translate('xpack.searchHomepage.getStarted.newBadge', {
        defaultMessage: 'NEW',
      }),
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
      buttonComponent: (
        <TryInConsoleButton
          request={consoleTutorials.semanticSearch}
          color="text"
          type="button"
          application={application}
          consolePlugin={consolePlugin}
          sharePlugin={share}
          telemetryId="console_tutorials_semantic_search"
          data-test-subj="console_tutorials_semantic_search"
        />
      ),
      badgeText: i18n.translate('xpack.searchHomepage.getStarted.newBadge', {
        defaultMessage: 'NEW',
      }),
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
      buttonComponent: (
        <TryInConsoleButton
          request={consoleTutorials.esql}
          color="text"
          type="button"
          application={application}
          consolePlugin={consolePlugin}
          sharePlugin={share}
          telemetryId="console_tutorials_esql"
          data-test-subj="console_tutorials_esql"
        />
      ),
      badgeText: i18n.translate('xpack.searchHomepage.getStarted.newBadge', {
        defaultMessage: 'NEW',
      }),
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m" direction="column" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.searchHomepage.getStarted.title', {
              defaultMessage: 'Get started with Elasticsearch',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGrid columns={4} gutterSize="l">
          <GettingStartedCards
            cards={gettingStartedCards}
            hoveredCard={hoveredCard}
            onCardHover={setHoveredCard}
          />
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
