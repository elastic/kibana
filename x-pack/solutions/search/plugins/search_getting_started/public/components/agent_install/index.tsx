/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiButtonGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SearchGettingStartedSectionHeading } from '../section_heading';
import { PromptModal } from './prompt_modal';

type UseCaseId =
  | 'general-search'
  | 'semantic-search'
  | 'vector-database'
  | 'rag-chatbot'
  | 'keyword-search'
  | 'hybrid-search'
  | 'catalog-ecommerce';

type Environment = 'cursor' | 'cli' | 'agent-builder';

interface UseCaseOption {
  id: UseCaseId;
  label: string;
}

const USE_CASE_OPTIONS: UseCaseOption[] = [
  {
    id: 'general-search',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.generalSearch', {
      defaultMessage: 'General search',
    }),
  },
  {
    id: 'semantic-search',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.semanticSearch', {
      defaultMessage: 'Semantic search',
    }),
  },
  {
    id: 'vector-database',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.vectorDatabase', {
      defaultMessage: 'Vector database',
    }),
  },
  {
    id: 'rag-chatbot',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.ragChat', {
      defaultMessage: 'RAG chat',
    }),
  },
  {
    id: 'keyword-search',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.keywordSearch', {
      defaultMessage: 'Keyword search',
    }),
  },
  {
    id: 'hybrid-search',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.hybridSearch', {
      defaultMessage: 'Hybrid search',
    }),
  },
  {
    id: 'catalog-ecommerce',
    label: i18n.translate('xpack.gettingStarted.cursorAgent.useCase.catalogSearch', {
      defaultMessage: 'Catalog search',
    }),
  },
];

const BASE_PROMPT_LINES_CURSOR = [
  'Fetch and run this remote script:',
  'curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-cursor.sh | sh',
  'Then help me get started with Elasticsearch.',
];

const BASE_PROMPT_LINES_CLI = [
  'Fetch and run this remote script:',
  'curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-agent.sh | sh',
  'Then help me get started with Elasticsearch.',
];

const buildPrompt = (useCaseId: UseCaseId, environment: Environment) => {
  switch (environment) {
    case 'cursor':
      return addUseCaseSkill(useCaseId, BASE_PROMPT_LINES_CURSOR);
    case 'cli':
      return addUseCaseSkill(useCaseId, BASE_PROMPT_LINES_CLI);
    case 'agent-builder':
      // return buildAgentBuilderDeeplinkUrl(useCaseId);
      return '';
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};

const addUseCaseSkill = (useCaseId: UseCaseId, basePromptLines: string[]): string => {
  const skillLine =
    useCaseId === 'general-search'
      ? ''
      : `Finally, follow the /${useCaseId} skill for my use case.`;
  const promptLines = skillLine ? [...basePromptLines, skillLine] : basePromptLines;
  return promptLines.join('\n');
};

export const AgentInstallSection = () => {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseId>('general-search');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');

  const selectOptions = useMemo(
    () =>
      USE_CASE_OPTIONS.map((option) => ({
        value: option.id,
        inputDisplay: option.label,
        'data-test-subj': `useCase-option-${option.id}`,
      })),
    []
  );

  const cursorDeeplinkUrl = useMemo(
    () =>
      `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(
        buildPrompt(selectedUseCase, 'cursor')
      )}`,
    [selectedUseCase]
  );

  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const closePromptModal = useCallback(() => setIsPromptModalOpen(false), []);

  const handleOpenInCursor = useCallback(() => {
    closePopover();
    window.open(cursorDeeplinkUrl, '_blank');
  }, [cursorDeeplinkUrl, closePopover]);

  const handleOpenInClaudeCli = useCallback(() => {
    closePopover();
    const prompt = buildPrompt(selectedUseCase, 'cli');
    // Show a modal with the Claude/CLI prompt for the selected use case
    setIsPromptModalOpen(true);
    setModalPrompt(prompt);
  }, [selectedUseCase, closePopover]);

  const handleOpenInAgentBuilder = useCallback(() => {
    closePopover();
    // TODO: implement Agent Builder handler
  }, [closePopover]);

  const launchButton = (
    <EuiButtonGroup
      legend={i18n.translate('xpack.gettingStarted.cursorAgent.launchLegend', {
        defaultMessage: 'Launch assistant',
      })}
      buttonSize="m"
      options={[
        {
          id: 'launchAssistant',
          label: i18n.translate('xpack.gettingStarted.cursorAgent.launchButton', {
            defaultMessage: 'Open in...',
          }),
          iconType: 'arrowDown',
          iconSide: 'right' as const,
        },
      ]}
      idSelected="launchAssistant"
      onChange={togglePopover}
      data-test-subj="cursorAgentLaunchBtn"
    />
  );

  return (
    <>
      <SearchGettingStartedSectionHeading
        icon="sparkles"
        title={i18n.translate('xpack.gettingStarted.cursorAgent.title', {
          defaultMessage: 'Build search with your AI assistant',
        })}
        description={i18n.translate('xpack.gettingStarted.cursorAgent.description', {
          defaultMessage:
            'Install the Elasticsearch assistant into your LLM environment to get AI-powered help with building your search application.',
        })}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              {i18n.translate('xpack.gettingStarted.cursorAgent.useCaseDescription', {
                defaultMessage: 'Have a specific use case in mind?',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperSelect<UseCaseId>
            options={selectOptions}
            valueOfSelected={selectedUseCase}
            onChange={setSelectedUseCase}
            aria-label={i18n.translate('xpack.gettingStarted.cursorAgent.useCaseSelectLabel', {
              defaultMessage: 'Select a use case',
            })}
            data-test-subj="cursorAgentUseCaseSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={launchButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="cursor"
                  icon="launch"
                  onClick={handleOpenInCursor}
                  data-test-subj="cursorAgentOpenInCursor"
                >
                  {i18n.translate('xpack.gettingStarted.cursorAgent.menuCursor', {
                    defaultMessage: 'Cursor',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="claude-cli"
                  icon="console"
                  onClick={handleOpenInClaudeCli}
                  data-test-subj="cursorAgentOpenInClaudeCli"
                >
                  {i18n.translate('xpack.gettingStarted.cursorAgent.menuClaudeCli', {
                    defaultMessage: 'Claude / CLI',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="agent-builder"
                  icon="wrench"
                  onClick={handleOpenInAgentBuilder}
                  data-test-subj="cursorAgentOpenInAgentBuilder"
                >
                  {i18n.translate('xpack.gettingStarted.cursorAgent.menuAgentBuilder', {
                    defaultMessage: 'Agent Builder',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPromptModalOpen && (
        <PromptModal prompt={modalPrompt} onClose={closePromptModal} />
      )}
    </>
  );
};
