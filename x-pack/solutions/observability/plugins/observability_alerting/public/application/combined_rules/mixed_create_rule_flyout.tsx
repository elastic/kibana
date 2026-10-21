/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiInputPopover,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiFontSizeFromScale,
  euiLineHeightFromBaseline,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConversationInputShell } from '@kbn/agent-builder-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDebounceFn } from '@kbn/react-hooks';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useFindTemplatesQuery } from '@kbn/response-ops-rules-apis/hooks/use_find_templates_query';
import type { CoreStart } from '@kbn/core/public';
import { SvgAiGradientDefs, useSvgAiGradient } from '@kbn/ui-ai-components';

const TITLE_ID = 'mixedCreateRuleFlyoutTitle';
const CLASSIC_TITLE_ID = 'mixedClassicRuleTypesFlyoutTitle';
const MEASURE_SUGGESTIONS_LIST_ID = 'mixedRulesMeasureSuggestionsList';
const SEARCH_DEBOUNCE = { wait: 300 };

type ClassicChooserMode = 'ruleType' | 'template';

const PRODUCER_DISPLAY_NAMES: Record<string, string> = {
  apm: 'APM and User Experience',
  ml: 'Machine Learning',
  monitoring: 'Stack Monitoring',
  stackAlerts: 'Stack Alerts',
  metrics: 'Metrics',
  logs: 'Logs',
  observability: 'Observability',
  slo: 'SLOs',
  infrastructure: 'Infrastructure',
  uptime: 'Synthetics and Uptime',
};

const producerLabel = (producer: string): string => PRODUCER_DISPLAY_NAMES[producer] ?? producer;

const optionCardStyles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
          textAlign: 'left',
          cursor: 'pointer',
        })
      : // required for unit tests to pass
        undefined,
  textColumn: css({
    minWidth: 0,
  }),
  title: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          color: euiTheme.colors.textParagraph,
        })
      : // required for unit tests to pass
        undefined,
  description: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          marginTop: euiTheme.size.xs,
        })
      : // required for unit tests to pass
        undefined,
  stack: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          display: 'flex',
          flexDirection: 'column',
          gap: euiTheme.size.s,
        })
      : // required for unit tests to pass
        undefined,
};

const FeaturedOptionCard = ({
  iconType,
  title,
  description,
  onClick,
  badge,
  'data-test-subj': dataTestSubj,
}: {
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: React.ReactNode;
  'data-test-subj': string;
}) => (
  <EuiPanel
    element="button"
    hasBorder
    paddingSize="none"
    onClick={onClick}
    data-test-subj={dataTestSubj}
    css={optionCardStyles.panel}
  >
    <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="m" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem css={optionCardStyles.textColumn}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="left" css={optionCardStyles.title}>
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          {badge ? <EuiFlexItem grow={false}>{badge}</EuiFlexItem> : null}
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued" textAlign="left" css={optionCardStyles.description}>
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const LargeOptionCard = ({
  iconType,
  title,
  description,
  onClick,
  badge,
  'data-test-subj': dataTestSubj,
}: {
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: React.ReactNode;
  'data-test-subj': string;
}) => (
  <EuiCard
    layout="horizontal"
    display="plain"
    titleElement="h3"
    titleSize="xs"
    hasBorder
    title={
      badge ? (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>{badge}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        title
      )
    }
    description={description}
    onClick={onClick}
    icon={<EuiIcon type={iconType} color="text" size="l" aria-hidden={true} />}
    data-test-subj={dataTestSubj}
  />
);

const CLASSIC_SUGGESTION_LIMIT = 3;

type ClassicRuleTypeSuggestion = {
  id: string;
  name: string;
};

const classicContinueCardStyles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          padding: 0,
          overflow: 'hidden',
          // Match EuiFlyoutFooter background
          backgroundColor: euiTheme.components.flyoutFooterBackground,
          borderColor: euiTheme.colors.borderBasePlain,
        })
      : // required for unit tests to pass
        undefined,
  browseButton: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          width: '100%',
          padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
          textAlign: 'left',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          '&:hover, &:focus': {
            backgroundColor: euiTheme.components.buttons.backgroundEmptyTextHover,
          },
        })
      : undefined,
  textColumn: css({
    minWidth: 0,
  }),
  suggestionList: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          margin: 0,
          padding: `${euiTheme.size.xs} 0`,
          listStyle: 'none',
        })
      : undefined,
  suggestionButton: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
          textAlign: 'left',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          '&:hover, &:focus': {
            backgroundColor: euiTheme.components.buttons.backgroundEmptyTextHover,
          },
        })
      : undefined,
};

const ClassicContinueCard = ({
  title,
  description,
  suggestions,
  onBrowseAll,
  onSelectRuleType,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  description: string;
  suggestions: ClassicRuleTypeSuggestion[];
  onBrowseAll: () => void;
  onSelectRuleType: (ruleTypeId: string) => void;
  'data-test-subj': string;
}) => (
  <EuiPanel hasBorder paddingSize="none" data-test-subj={dataTestSubj} css={classicContinueCardStyles.panel}>
    <button
      type="button"
      onClick={onBrowseAll}
      css={classicContinueCardStyles.browseButton}
      data-test-subj={`${dataTestSubj}-browseAll`}
      aria-label={title}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem css={classicContinueCardStyles.textColumn}>
          <EuiText size="s" textAlign="left">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" textAlign="left">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </button>
    {suggestions.length > 0 ? (
      <ul css={classicContinueCardStyles.suggestionList} data-test-subj={`${dataTestSubj}-suggestions`}>
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <button
              type="button"
              onClick={() => onSelectRuleType(suggestion.id)}
              css={classicContinueCardStyles.suggestionButton}
              data-test-subj={`${dataTestSubj}-suggestion-${suggestion.id}`}
            >
              <EuiIcon type="bell" size="s" color="subdued" aria-hidden={true} />
              <EuiText size="s" textAlign="left">
                {suggestion.name}
              </EuiText>
            </button>
          </li>
        ))}
      </ul>
    ) : null}
  </EuiPanel>
);

const ExperimentalBadge = () => (
  <EuiBetaBadge
    size="s"
    label={i18n.translate('xpack.observabilityAlerting.mixedCreate.experimental', {
      defaultMessage: 'Experimental',
    })}
  />
);

export const MixedCreateRuleFlyout = ({
  onClose,
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  onSelectClassicRuleType,
  showClassic,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
}: {
  onClose: () => void;
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  showClassic: boolean;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
}) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MixedCreateRuleFlyoutInner
        onClose={onClose}
        onChooseThreshold={onChooseThreshold}
        onChooseEsql={onChooseEsql}
        onChooseAgent={onChooseAgent}
        onChooseSequence={onChooseSequence}
        onBrowseClassic={onBrowseClassic}
        onSelectClassicRuleType={onSelectClassicRuleType}
        showClassic={showClassic}
        http={http}
        toasts={toasts}
        registeredRuleTypes={registeredRuleTypes}
        historyKey={historyKey}
      />
    </QueryClientProvider>
  );
};

const MixedCreateRuleFlyoutInner = ({
  onClose,
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  onSelectClassicRuleType,
  showClassic,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
}: {
  onClose: () => void;
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  showClassic: boolean;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
}) => {
  const {
    ruleTypesState: { data: ruleTypeIndex },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    registeredRuleTypes,
    enabled: showClassic,
  });

  const classicCount = ruleTypeIndex.size;

  return (
    <EuiFlyout
      type="overlay"
      session="start"
      historyKey={historyKey}
      size={540}
      minWidth={480}
      resizable
      ownFocus
      onClose={onClose}
      hideCloseButton
      aria-labelledby={TITLE_ID}
      flyoutMenuProps={{
        title: i18n.translate('xpack.observabilityAlerting.mixedRules.createFlyoutHistoryTitle', {
          defaultMessage: 'Create rule',
        }),
      }}
      data-test-subj="mixedRulesExperienceChooser"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="s" id={TITLE_ID}>
              <h2>
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.title"
                  defaultMessage="Create rule"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.observabilityAlerting.mixedCreate.close', {
                defaultMessage: 'Close',
              })}
            >
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onClose}
                aria-label={i18n.translate('xpack.observabilityAlerting.mixedCreate.close', {
                  defaultMessage: 'Close',
                })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <V2OptionsBody
          onChooseThreshold={onChooseThreshold}
          onChooseEsql={onChooseEsql}
          onChooseAgent={onChooseAgent}
          onChooseSequence={onChooseSequence}
          onBrowseClassic={onBrowseClassic}
          onSelectClassicRuleType={onSelectClassicRuleType}
          classicRuleTypes={[...ruleTypeIndex.values()].map((ruleType) => ({
            id: ruleType.id,
            name: ruleType.name,
            description: ruleType.description,
          }))}
          showClassic={showClassic}
        />
      </EuiFlyoutBody>
      {showClassic ? (
        <EuiFlyoutFooter>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.classicPrompt"
                    defaultMessage="Looking for a Classic rule type?"
                  />
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.classicPromptHint"
                  defaultMessage="Browse {count} Classic rule types and templates."
                  values={{ count: classicCount || '—' }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="text"
                iconType="sortRight"
                iconSide="right"
                onClick={() => onBrowseClassic()}
                data-test-subj="mixedRulesBrowseClassic"
              >
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.browseClassic"
                  defaultMessage="Browse Classic rules"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};

const CLASSIC_MODE_OPTIONS = [
  {
    id: 'ruleType' as const,
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.classicRuleTypeTab', {
      defaultMessage: 'Rule type',
    }),
  },
  {
    id: 'template' as const,
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.classicTemplateTab', {
      defaultMessage: 'Template',
    }),
  },
];

export const MixedClassicRuleTypesFlyout = ({
  onClose,
  onSelectClassicRuleType,
  onSelectTemplate,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
  initialSearch = '',
}: {
  onClose: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
  initialSearch?: string;
}) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MixedClassicRuleTypesFlyoutInner
        onClose={onClose}
        onSelectClassicRuleType={onSelectClassicRuleType}
        onSelectTemplate={onSelectTemplate}
        http={http}
        toasts={toasts}
        registeredRuleTypes={registeredRuleTypes}
        historyKey={historyKey}
        initialSearch={initialSearch}
      />
    </QueryClientProvider>
  );
};

const MixedClassicRuleTypesFlyoutInner = ({
  onClose,
  onSelectClassicRuleType,
  onSelectTemplate,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
  initialSearch,
}: {
  onClose: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
  initialSearch: string;
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedMode, setSelectedMode] = useState<ClassicChooserMode>('ruleType');
  const { run: updateDebouncedSearch } = useDebounceFn(setDebouncedSearch, SEARCH_DEBOUNCE);

  const onChangeSearch = useCallback(
    (value: string) => {
      setSearch(value);
      updateDebouncedSearch(value);
    },
    [updateDebouncedSearch]
  );

  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    registeredRuleTypes,
    enabled: true,
  });

  const {
    templates,
    hasNextPage: hasMoreTemplates,
    fetchNextPage: loadMoreTemplates,
    isLoading: templatesLoading,
    isFetchingNextPage: templatesLoadingMore,
  } = useFindTemplatesQuery({
    http,
    toasts,
    enabled: selectedMode === 'template',
    perPage: 10,
    sortField: 'name',
    sortOrder: 'asc',
    search: debouncedSearch || undefined,
  });

  const classicTypes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...ruleTypeIndex.values()]
      .filter((ruleType) => {
        if (!query) {
          return true;
        }
        const name = ruleType.name.toLowerCase();
        const description = (ruleType.description ?? '').toLowerCase();
        return name.includes(query) || description.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ruleTypeIndex, search]);

  const groupedTypes = useMemo(() => {
    const groups = new Map<string, typeof classicTypes>();
    for (const ruleType of classicTypes) {
      const label = producerLabel(ruleType.producer);
      const existing = groups.get(label) ?? [];
      existing.push(ruleType);
      groups.set(label, existing);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [classicTypes]);

  const isTemplateMode = selectedMode === 'template';

  return (
    <EuiFlyout
      type="overlay"
      session="start"
      historyKey={historyKey}
      size={540}
      minWidth={480}
      resizable
      ownFocus
      onClose={onClose}
      aria-labelledby={CLASSIC_TITLE_ID}
      flyoutMenuProps={{
        title: i18n.translate('xpack.observabilityAlerting.mixedCreate.classicTitle', {
          defaultMessage: 'Classic rule types',
        }),
      }}
      data-test-subj="mixedRulesClassicChooser"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={CLASSIC_TITLE_ID}>
          <h2>
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.classicTitle"
              defaultMessage="Classic rule types"
            />
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {isTemplateMode ? (
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.classicTemplateSubtitle"
                defaultMessage="Start from a saved Classic template."
              />
            ) : (
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.classicSubtitle"
                defaultMessage="Choose from {count} solution-specific rule types."
                values={{ count: ruleTypeIndex.size }}
              />
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButtonGroup
          legend={i18n.translate('xpack.observabilityAlerting.mixedCreate.classicModeLegend', {
            defaultMessage: 'Select creation mode',
          })}
          options={CLASSIC_MODE_OPTIONS}
          idSelected={selectedMode}
          onChange={(id) => setSelectedMode(id as ClassicChooserMode)}
          buttonSize="compressed"
          isFullWidth
          data-test-subj="mixedRulesClassicMode"
        />
        <EuiSpacer size="s" />
        <EuiFieldSearch
          fullWidth
          placeholder={
            isTemplateMode
              ? i18n.translate('xpack.observabilityAlerting.mixedCreate.searchTemplates', {
                  defaultMessage: 'Search templates...',
                })
              : i18n.translate('xpack.observabilityAlerting.mixedCreate.searchClassic', {
                  defaultMessage: 'Search classic rule types',
                })
          }
          value={search}
          onChange={(event) => onChangeSearch(event.target.value)}
          data-test-subj="mixedRulesClassicSearch"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {isTemplateMode ? (
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.classicTemplateCount"
                  defaultMessage="{count} templates"
                  values={{ count: templates.length }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.classicCount"
                  defaultMessage="{count} rule types"
                  values={{ count: classicTypes.length }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.classicAuthoring"
                defaultMessage="Classic authoring"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isTemplateMode ? (
          templatesLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : templates.length === 0 ? (
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.noTemplates"
                defaultMessage="No templates found"
              />
            </EuiText>
          ) : (
            <>
              {templates.map((template) => (
                <React.Fragment key={template.id}>
                  <EuiPanel
                    element="button"
                    paddingSize="s"
                    hasBorder={false}
                    hasShadow={false}
                    onClick={() => onSelectTemplate(template.id)}
                    data-test-subj={`${template.id}-SelectOption`}
                  >
                    <EuiText size="s">
                      <strong>{template.name}</strong>
                    </EuiText>
                    {template.tags?.length ? (
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {template.tags.map((tag) => (
                          <EuiFlexItem key={tag} grow={false}>
                            <EuiBadge color="hollow">{tag}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    ) : null}
                  </EuiPanel>
                  <EuiSpacer size="xs" />
                </React.Fragment>
              ))}
              {hasMoreTemplates ? (
                <EuiButtonEmpty
                  onClick={() => loadMoreTemplates()}
                  isLoading={templatesLoadingMore}
                  data-test-subj="mixedRulesClassicLoadMoreTemplates"
                >
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.loadMoreTemplates"
                    defaultMessage="Load more"
                  />
                </EuiButtonEmpty>
              ) : null}
            </>
          )
        ) : isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          groupedTypes.map(([group, types]) => (
            <div key={group}>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiText size="xs">
                    <strong>{group.toUpperCase()}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {types.length}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              {types.map((ruleType) => (
                <React.Fragment key={ruleType.id}>
                  <EuiPanel
                    element="button"
                    paddingSize="s"
                    hasBorder={false}
                    hasShadow={false}
                    onClick={() => onSelectClassicRuleType(ruleType.id)}
                    data-test-subj={`${ruleType.id}-SelectOption`}
                  >
                    <EuiText size="s">
                      <strong>{ruleType.name}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.observabilityAlerting.mixedCreate.opensClassic"
                        defaultMessage="Opens in the classic rule editor"
                      />
                    </EuiText>
                  </EuiPanel>
                  <EuiSpacer size="xs" />
                </React.Fragment>
              ))}
              <EuiSpacer size="m" />
            </div>
          ))
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

type DataDomain = 'infra' | 'apm' | 'ml' | 'logs' | 'synthetics' | 'slo' | 'custom' | 'specific';
type CreatePath = 'threshold' | 'esql';

const DEFAULT_CREATE_PATHS: CreatePath[] = ['threshold', 'esql'];

type DataDomainOption = {
  id: DataDomain;
  label: string;
  /** Short subtitle shown under the label in search suggestions. */
  description: string;
  /** When true, Universal can’t cover this well yet — route to Classic. */
  prefersClassic?: boolean;
  /**
   * Term passed to the Classic rule-type search. Must match rule type names
   * (e.g. "APM", "SLOs") — full suggestion descriptions return no results.
   */
  classicSearch?: string;
  /** Ordered Create-section paths (Threshold, ES|QL). */
  createPaths: CreatePath[];
  /** When true, show Sequence under Build your own for this domain. */
  showSequence?: boolean;
  hint: string;
  examplePrompt: string;
};

/**
 * Demo-only v2 rule-library templates. Only domains with Universal (v2) create
 * paths get templates — Classic-only domains (APM, ML, Synthetics, SLOs) fall
 * back cleanly with no library suggestions. Real templates will come from the API later.
 */
type DemoRuleTemplate = {
  id: string;
  title: string;
  description: string;
  iconType: string;
  createPath: CreatePath;
  domains: DataDomain[];
};

const DEMO_RULE_TEMPLATES: DemoRuleTemplate[] = [
  {
    id: 'demo-high-cpu',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.demoTemplate.highCpuTitle', {
      defaultMessage: 'High CPU utilization',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.demoTemplate.highCpuDescription',
      {
        defaultMessage: 'Alert when host or container CPU stays above a threshold.',
      }
    ),
    iconType: 'visGauge',
    createPath: 'threshold',
    domains: ['infra'],
  },
  {
    id: 'demo-memory-pressure',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.demoTemplate.memoryTitle', {
      defaultMessage: 'Host memory pressure',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.demoTemplate.memoryDescription',
      {
        defaultMessage: 'Detect sustained high memory use before OOM kills.',
      }
    ),
    iconType: 'visGauge',
    createPath: 'threshold',
    domains: ['infra'],
  },
  {
    id: 'demo-disk-low',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.demoTemplate.diskTitle', {
      defaultMessage: 'Disk space critically low',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.demoTemplate.diskDescription',
      {
        defaultMessage: 'Warn when free disk on a host drops below a set percent.',
      }
    ),
    iconType: 'visGauge',
    createPath: 'threshold',
    domains: ['infra'],
  },
  {
    id: 'demo-error-log-spike',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.demoTemplate.errorSpikeTitle', {
      defaultMessage: 'Error log spike',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.demoTemplate.errorSpikeDescription',
      {
        defaultMessage: 'ES|QL rule that counts error-level logs over a time window.',
      }
    ),
    iconType: 'code',
    createPath: 'esql',
    domains: ['logs'],
  },
  {
    id: 'demo-auth-failures',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.demoTemplate.authFailTitle', {
      defaultMessage: 'Authentication failures',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.demoTemplate.authFailDescription',
      {
        defaultMessage: 'Spot bursts of failed logins in application or audit logs.',
      }
    ),
    iconType: 'code',
    createPath: 'esql',
    domains: ['logs'],
  },
];

/** Templates only for Universal-supported domains; Classic fallback domains get none. */
const getSuggestedTemplatesForDomain = (
  domain: DataDomainOption | null
): DemoRuleTemplate[] => {
  if (!domain || domain.prefersClassic || domain.createPaths.length === 0) {
    return [];
  }
  return DEMO_RULE_TEMPLATES.filter((template) => template.domains.includes(domain.id)).slice(
    0,
    3
  );
};

type DomainSuggestionOption = EuiSelectableOption & {
  description?: string;
};

/** Same options as the Agent Builder ask-user question — offered as search suggestions. */
const DATA_DOMAIN_OPTIONS: DataDomainOption[] = [
  {
    id: 'infra',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainInfra', {
      defaultMessage: 'Infrastructure metrics',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainInfraDescription', {
      defaultMessage: 'CPU, memory, disk, network on hosts or containers',
    }),
    createPaths: ['threshold', 'esql'],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainInfraHint', {
      defaultMessage: 'Start with a Threshold rule, or turn on AI mode to describe the condition.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainInfraExample', {
      defaultMessage: 'CPU, memory, disk, network on hosts or containers',
    }),
  },
  {
    id: 'apm',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainApm', {
      defaultMessage: 'Application / APM',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainApmDescription', {
      defaultMessage: 'Error rates, latency, throughput for services',
    }),
    prefersClassic: true,
    classicSearch: 'APM',
    createPaths: [],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainApmHint', {
      defaultMessage: 'APM rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainApmExample', {
      defaultMessage: 'APM',
    }),
  },
  {
    id: 'ml',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainMl', {
      defaultMessage: 'Machine Learning',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainMlDescription', {
      defaultMessage: 'Anomaly detection jobs and ML-based alerts',
    }),
    prefersClassic: true,
    classicSearch: 'Anomaly',
    createPaths: [],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainMlHint', {
      defaultMessage: 'Anomaly detection and ML rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainMlExample', {
      defaultMessage: 'Anomaly',
    }),
  },
  {
    id: 'logs',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogs', {
      defaultMessage: 'Logs',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsDescription', {
      defaultMessage: 'Error counts, patterns, or spikes in log data',
    }),
    createPaths: ['threshold', 'esql'],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsHint', {
      defaultMessage:
        'Use Threshold for counts, ES|QL for custom queries, or AI mode to describe what you want.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsExample', {
      defaultMessage: 'Error counts, patterns, or spikes in log data',
    }),
  },
  {
    id: 'synthetics',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSynthetics', {
      defaultMessage: 'Synthetics / Uptime',
    }),
    description: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.domainSyntheticsDescription',
      {
        defaultMessage: 'Availability and response times for endpoints and journeys',
      }
    ),
    prefersClassic: true,
    classicSearch: 'Synthetics',
    createPaths: [],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSyntheticsHint', {
      defaultMessage: 'Synthetics and Uptime rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate(
      'xpack.observabilityAlerting.mixedCreate.domainSyntheticsExample',
      {
        defaultMessage: 'Synthetics',
      }
    ),
  },
  {
    id: 'slo',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSlo', {
      defaultMessage: 'SLOs',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSloDescription', {
      defaultMessage: 'Burn rate and error budget for service level objectives',
    }),
    prefersClassic: true,
    classicSearch: 'SLOs',
    createPaths: [],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSloHint', {
      defaultMessage: 'SLO burn-rate rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSloExample', {
      defaultMessage: 'SLOs',
    }),
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainCustom', {
      defaultMessage: 'Custom index',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainCustomDescription', {
      defaultMessage: 'Query a specific index with ES|QL or a threshold',
    }),
    createPaths: ['esql', 'threshold'],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainCustomHint', {
      defaultMessage: 'ES|QL is the best fit when you already know the index and query shape.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainCustomExample', {
      defaultMessage: 'I have a specific index I want to query',
    }),
  },
];

const SPECIFIC_DOMAIN_FALLBACK: DataDomainOption = {
  id: 'specific',
  label: '',
  description: '',
  createPaths: ['threshold', 'esql'],
  // Free-text / unclear intent — Sequence can still be a fit.
  showSequence: true,
  hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSpecificHint', {
    defaultMessage: 'Turn on AI mode to describe it, or start from a Threshold builder.',
  }),
  examplePrompt: '',
};

/**
 * Prototype-only keyword matching to reshape recommendations from free text.
 * Classic-only domains (APM, ML, Synthetics, SLOs) are inferred separately.
 * Threshold-style intents stay on the Universal Threshold builder.
 */
const inferDataDomain = (text: string): DataDomain | null => {
  const value = text.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (/\b(apm|transaction|span|trace|latency|throughput)\b/.test(value)) {
    return 'apm';
  }
  if (/\b(ml|anomaly|anomalies|machine learning)\b/.test(value)) {
    return 'ml';
  }
  if (/\b(sequence|multi-?step|chain rules|rules on rules)\b/.test(value)) {
    return 'specific';
  }
  if (/\b(synthetics?|uptime|heartbeat|monitor journey|ping check)\b/.test(value)) {
    return 'synthetics';
  }
  if (/\b(slo|slis?|error budget|burn rate)\b/.test(value)) {
    return 'slo';
  }
  // Classic threshold-style rule types → Universal Threshold (not Classic).
  if (/\b(metric threshold|log threshold|index threshold)\b/.test(value)) {
    return /\blog threshold\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\bthreshold\b/.test(value)) {
    return /\blog\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\b(from |stats |where |esql)\b/.test(value) || value.includes('|') || value.includes('*')) {
    return 'custom';
  }
  if (/\b(log|logs|error message|stacktrace)\b/.test(value)) {
    return 'logs';
  }
  if (/\b(cpu|memory|disk|host|container|pod|infra|metric)\b/.test(value)) {
    return 'infra';
  }
  if (value.length >= 12) {
    return 'specific';
  }
  return null;
};

/** Matches Discover QuickSearchVisor mode toggle (magnify + sparkles). */
const measureModeToggleStyles = ({ euiTheme }: UseEuiTheme) => ({
  modeToggle: css`
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    box-sizing: border-box;
    gap: ${euiTheme.size.xs};
    block-size: ${euiTheme.size.xl};
    max-block-size: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.control};

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border: ${euiTheme.border.width.thin} solid ${euiTheme.components.forms.border};
      border-radius: inherit;
      pointer-events: none;
    }

    .euiButtonIcon {
      border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
    }
  `,
  modeIconButton: css`
    &.euiButtonIcon {
      inline-size: ${euiTheme.size.l};
      block-size: ${euiTheme.size.l};
      border-radius: calc(${euiTheme.border.radius.control} - ${euiTheme.size.xxs});
      background-color: transparent;

      &:hover,
      &:focus,
      &:focus-visible {
        background-color: ${euiTheme.components.buttons.backgroundEmptyTextHover};
      }
    }
  `,
  modeIconButtonActive: css`
    &.euiButtonIcon,
    &.euiButtonIcon:hover,
    &.euiButtonIcon:focus,
    &.euiButtonIcon:focus-visible {
      background-color: ${euiTheme.colors.backgroundLightText};
    }
  `,
  aiButtonSelected: css`
    background: linear-gradient(
      180deg,
      ${euiTheme.components.buttons.backgroundPrimaryHover} 18%,
      ${euiTheme.components.buttons.backgroundAssistanceHover} 83%
    ) !important;
  `,
});

const agentChatInputStyles = ({ euiTheme }: UseEuiTheme) => ({
  textarea: css`
    flex: 1;
    cursor: text;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-size: ${euiFontSizeFromScale('m', euiTheme)};
    line-height: ${euiLineHeightFromBaseline('m', euiTheme)};
    color: ${euiTheme.colors.textParagraph};
    font-family: inherit;

    &::placeholder {
      color: ${euiTheme.colors.textDisabled};
    }

    :focus:focus-visible {
      outline-style: none;
    }
  `,
  sendRow: css`
    display: flex;
    justify-content: flex-end;
  `,
});

const SEARCH_MODE_LABEL = i18n.translate(
  'xpack.observabilityAlerting.mixedCreate.searchModeLabel',
  {
    defaultMessage: 'Search suggestions',
  }
);

const AI_MODE_LABEL = i18n.translate('xpack.observabilityAlerting.mixedCreate.aiModeTooltip', {
  defaultMessage: 'Describe a rule in natural language with the AI agent',
});

const MODE_TOGGLE_LEGEND = i18n.translate(
  'xpack.observabilityAlerting.mixedCreate.modeToggleLegend',
  {
    defaultMessage: 'Switch between search and AI',
  }
);

const MeasureModeToggle = ({
  isAiMode,
  onModeChange,
}: {
  isAiMode: boolean;
  onModeChange: (nextIsAiMode: boolean) => void;
}): JSX.Element => {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => measureModeToggleStyles(euiThemeContext), [euiThemeContext]);
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });
  // productAgent is an app icon: paths inherit fill and use .euiIcon__fillSecondary, so the
  // shared iconGradientCss ([fill] + svg root) is not enough — paint every path like sparkles.
  const agentIconGradientCss = useMemo(
    () => css`
      & .euiIcon,
      & .euiIcon path,
      & .euiIcon .euiIcon__fillSecondary {
        fill: url(#${gradientId}) !important;
      }
    `,
    [gradientId]
  );

  return (
    <div
      role="group"
      aria-label={MODE_TOGGLE_LEGEND}
      css={styles.modeToggle}
      data-test-subj="mixedRulesModeToggle"
    >
      <EuiToolTip content={SEARCH_MODE_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="magnify"
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={SEARCH_MODE_LABEL}
          aria-pressed={!isAiMode}
          isSelected={!isAiMode}
          onClick={() => onModeChange(false)}
          data-test-subj="mixedRulesSearchMode"
          css={[styles.modeIconButton, !isAiMode && styles.modeIconButtonActive]}
        />
      </EuiToolTip>
      {isAiMode ? <SvgAiGradientDefs gradientId={gradientId} colors={colors} /> : null}
      <EuiToolTip content={AI_MODE_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="productAgent"
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={AI_MODE_LABEL}
          aria-pressed={isAiMode}
          isSelected={isAiMode}
          onClick={() => onModeChange(true)}
          data-test-subj="mixedRulesAiMode"
          css={[
            styles.modeIconButton,
            isAiMode && styles.aiButtonSelected,
            isAiMode && iconGradientCss,
            isAiMode && agentIconGradientCss,
          ]}
        />
      </EuiToolTip>
    </div>
  );
};

const V2OptionsBody = ({
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  onSelectClassicRuleType,
  classicRuleTypes,
  showClassic,
}: {
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  classicRuleTypes: Array<{ id: string; name: string; description?: string }>;
  showClassic: boolean;
}) => {
  const euiThemeContext = useEuiTheme();
  const chatStyles = useMemo(() => agentChatInputStyles(euiThemeContext), [euiThemeContext]);
  const [measureText, setMeasureText] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DataDomain | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  // Popover close refocuses the search field; ignore that one focus so Enter/Escape stay closed.
  const suppressSuggestionsFocusOpenRef = useRef(false);

  const closeSuggestions = ({ suppressFocusReopen = false }: { suppressFocusReopen?: boolean } = {}) => {
    if (suppressFocusReopen) {
      suppressSuggestionsFocusOpenRef.current = true;
    }
    setIsSuggestionsOpen(false);
  };

  const openSuggestions = () => {
    suppressSuggestionsFocusOpenRef.current = false;
    setIsSuggestionsOpen(true);
  };

  const inferredDomain = useMemo(() => inferDataDomain(measureText), [measureText]);
  const activeDomainId = selectedDomain ?? inferredDomain;
  const activeDomain =
    activeDomainId === 'specific'
      ? SPECIFIC_DOMAIN_FALLBACK
      : DATA_DOMAIN_OPTIONS.find((option) => option.id === activeDomainId) ?? null;

  const prefersClassic = Boolean(activeDomain?.prefersClassic && showClassic);
  const createPathIds = activeDomain?.createPaths ?? DEFAULT_CREATE_PATHS;
  // Idle (no domain): show Sequence. Domain match: only when that domain opts in.
  const showSequence = !activeDomain || Boolean(activeDomain.showSequence);
  const createSectionTitle = activeDomain
    ? i18n.translate('xpack.observabilityAlerting.mixedCreate.suggestedBuildersSection', {
        defaultMessage: 'Suggested builders',
      })
    : i18n.translate('xpack.observabilityAlerting.mixedCreate.recommendedSection', {
        defaultMessage: 'Start with a builder',
      });

  const measureQuery = measureText.trim().toLowerCase();

  const matchingDomainOptions = useMemo(() => {
    if (!measureQuery) {
      return DATA_DOMAIN_OPTIONS;
    }
    return DATA_DOMAIN_OPTIONS.filter((option) => {
      const haystacks = [
        option.label,
        option.description,
        option.classicSearch ?? '',
        option.examplePrompt,
      ].map((value) => value.toLowerCase());
      return haystacks.some((value) => value.includes(measureQuery));
    });
  }, [measureQuery]);

  const domainSuggestionOptions = useMemo<DomainSuggestionOption[]>(
    () =>
      matchingDomainOptions.map((option) => ({
        label: option.label,
        key: option.id,
        description: option.description,
        checked: selectedDomain === option.id ? ('on' as const) : undefined,
        'data-test-subj': `mixedRulesDomain-${option.id}`,
      })),
    [matchingDomainOptions, selectedDomain]
  );

  const selectDomainSuggestion = (domain: DataDomain) => {
    const option = DATA_DOMAIN_OPTIONS.find((item) => item.id === domain);
    setSelectedDomain(domain);
    // Main title goes in the search field — Classic rule-type filter needs it
    // (e.g. "SLOs", "APM"), not the longer description.
    setMeasureText(option?.classicSearch ?? option?.label ?? '');
    closeSuggestions({ suppressFocusReopen: true });
  };

  const classicBrowseSearch = useMemo(() => {
    const trimmed = measureText.trim();
    if (!trimmed) {
      return undefined;
    }
    // Only substitute the Classic search term when the field still holds the
    // selected suggestion title — keep free-text (e.g. "Anomaly") as typed.
    if (
      activeDomain?.classicSearch &&
      (trimmed === activeDomain.classicSearch ||
        trimmed === activeDomain.label ||
        trimmed === activeDomain.description)
    ) {
      return activeDomain.classicSearch;
    }
    return trimmed;
  }, [activeDomain, measureText]);

  const classicSuggestions = useMemo((): ClassicRuleTypeSuggestion[] => {
    if (!prefersClassic) {
      return [];
    }
    const query = (classicBrowseSearch ?? '').trim().toLowerCase();
    return classicRuleTypes
      .filter((ruleType) => {
        if (!query) {
          return true;
        }
        const name = ruleType.name.toLowerCase();
        const description = (ruleType.description ?? '').toLowerCase();
        return name.includes(query) || description.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, CLASSIC_SUGGESTION_LIMIT)
      .map(({ id, name }) => ({ id, name }));
  }, [classicBrowseSearch, classicRuleTypes, prefersClassic]);

  const resolveDomainFromMeasureText = (value: string): DataDomain | null => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const exactMatch = DATA_DOMAIN_OPTIONS.find(
      (option) =>
        option.classicSearch?.toLowerCase() === normalized ||
        option.label.toLowerCase() === normalized ||
        option.examplePrompt.toLowerCase() === normalized ||
        option.description.toLowerCase() === normalized
    );
    if (exactMatch) {
      return exactMatch.id;
    }

    const partialMatches = DATA_DOMAIN_OPTIONS.filter((option) => {
      const haystacks = [
        option.label,
        option.description,
        option.classicSearch ?? '',
        option.examplePrompt,
      ].map((text) => text.toLowerCase());
      return haystacks.some((text) => text.includes(normalized));
    });
    if (partialMatches.length === 1) {
      return partialMatches[0].id;
    }

    return null;
  };

  const onMeasureTextChange = (value: string) => {
    setMeasureText(value);
    setSelectedDomain(resolveDomainFromMeasureText(value));
  };

  // Panel is portaled outside the input tree; listen on window so Enter/Escape
  // still dismisses before EuiSelectable swallows the key with no active option.
  useEffect(() => {
    if (!isSuggestionsOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key !== 'Enter' && event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions({ suppressFocusReopen: true });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isSuggestionsOpen]);

  const createOptionById: Record<CreatePath, React.ReactNode> = {
    threshold: (
      <LargeOptionCard
        key="threshold"
        iconType="visGauge"
        title={i18n.translate('xpack.observabilityAlerting.mixedCreate.thresholdTitle', {
          defaultMessage: 'Threshold',
        })}
        description={i18n.translate(
          'xpack.observabilityAlerting.mixedCreate.thresholdDescription',
          {
            defaultMessage:
              'Alert when metrics or counts cross a threshold. Covers metric, log, and index threshold-style rules. No query required.',
          }
        )}
        onClick={onChooseThreshold}
        data-test-subj="mixedRulesChooseThreshold"
      />
    ),
    esql: (
      <FeaturedOptionCard
        key="esql"
        iconType="code"
        title={i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlTitle', {
          defaultMessage: 'ES|QL rule',
        })}
        description={i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlDescription', {
          defaultMessage: 'Write your own ES|QL query and preview the results live.',
        })}
        onClick={onChooseEsql}
        data-test-subj="mixedRulesChooseEsql"
      />
    ),
  };

  const sequenceBuilderCard = showSequence ? (
    <LargeOptionCard
      key="sequence"
      iconType="branch"
      title={i18n.translate('xpack.observabilityAlerting.mixedCreate.sequenceTitle', {
        defaultMessage: 'Sequence',
      })}
      description={i18n.translate('xpack.observabilityAlerting.mixedCreate.sequenceDescription', {
        defaultMessage: 'Chain rules for multi-step patterns.',
      })}
      onClick={onChooseSequence}
      badge={<ExperimentalBadge />}
      data-test-subj="mixedRulesChooseSequence"
    />
  ) : null;

  const builderCards = [
    ...createPathIds.filter((id) => id === 'threshold').map((id) => createOptionById[id]),
    ...(sequenceBuilderCard ? [sequenceBuilderCard] : []),
  ];
  const showEsqlCard = createPathIds.includes('esql');
  const showBuildYourOwnSection = showEsqlCard;

  // Universal path only — Classic domains never surface library templates.
  const suggestedTemplates = useMemo(
    () => (isAiMode || prefersClassic ? [] : getSuggestedTemplatesForDomain(activeDomain)),
    [activeDomain, isAiMode, prefersClassic]
  );

  const onSelectDemoTemplate = (template: DemoRuleTemplate) => {
    if (template.createPath === 'esql') {
      onChooseEsql();
      return;
    }
    onChooseThreshold();
  };

  const onMeasureSearch = (value: string) => {
    if (isAiMode) {
      onChooseAgent(value.trim() || undefined);
    }
  };

  const onAgentInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === keys.ENTER && !event.shiftKey) {
      event.preventDefault();
      onMeasureSearch(measureText);
    }
  };

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <strong>
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.measureQuestion"
                defaultMessage="What do you want to measure?"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MeasureModeToggle
            isAiMode={isAiMode}
            onModeChange={(nextIsAiMode) => {
              setIsAiMode(nextIsAiMode);
              if (!nextIsAiMode) {
                setSelectedDomain(null);
                setMeasureText('');
                closeSuggestions();
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isAiMode ? (
        <ConversationInputShell data-test-subj="mixedRulesAgentChatInput">
          <textarea
            css={chatStyles.textarea}
            rows={3}
            value={measureText}
            onChange={(event) => onMeasureTextChange(event.currentTarget.value)}
            onKeyDown={onAgentInputKeyDown}
            placeholder={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.aiModePlaceholder',
              {
                defaultMessage: 'Describe the rule you want in natural language',
              }
            )}
            aria-label={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.aiModeSearchAriaLabel',
              {
                defaultMessage: 'Describe the rule you want in natural language',
              }
            )}
            data-test-subj="mixedRulesMeasureSearch"
          />
          <div css={chatStyles.sendRow}>
            <EuiToolTip
              content={i18n.translate('xpack.observabilityAlerting.mixedCreate.submitTooltip', {
                defaultMessage: 'Submit',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="sortUp"
                display="fill"
                size="s"
                disabled={!measureText.trim()}
                onClick={() => onMeasureSearch(measureText)}
                aria-label={i18n.translate('xpack.observabilityAlerting.mixedCreate.submitLabel', {
                  defaultMessage: 'Submit',
                })}
                data-test-subj="mixedRulesMeasureSubmit"
              />
            </EuiToolTip>
          </div>
        </ConversationInputShell>
      ) : (
        <EuiInputPopover
          fullWidth
          disableFocusTrap
          panelPaddingSize="none"
          isOpen={isSuggestionsOpen}
          closePopover={closeSuggestions}
          input={
            <EuiFieldSearch
              fullWidth
              compressed
              value={measureText}
              onChange={(event) => {
                onMeasureTextChange(event.target.value);
                openSuggestions();
              }}
              onFocus={() => {
                if (suppressSuggestionsFocusOpenRef.current) {
                  suppressSuggestionsFocusOpenRef.current = false;
                  return;
                }
                openSuggestions();
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) {
                  return;
                }
                if (event.key !== keys.ENTER && event.key !== keys.ESCAPE) {
                  return;
                }
                event.preventDefault();
                closeSuggestions({ suppressFocusReopen: true });
              }}
              placeholder={i18n.translate(
                'xpack.observabilityAlerting.mixedCreate.measurePlaceholder',
                {
                  defaultMessage:
                    'Search or pick a suggestion — metrics, APM, logs, synthetics, SLOs…',
                }
              )}
              data-test-subj="mixedRulesMeasureSearch"
              role="combobox"
              aria-expanded={isSuggestionsOpen}
              aria-controls={MEASURE_SUGGESTIONS_LIST_ID}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-label={i18n.translate(
                'xpack.observabilityAlerting.mixedCreate.measureSearchAriaLabel',
                {
                  defaultMessage: 'What do you want to measure?',
                }
              )}
            />
          }
        >
          <EuiSelectable<DomainSuggestionOption>
            singleSelection
            isPreFiltered
            options={domainSuggestionOptions}
            noMatchesMessage={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.noMatchingCategories',
              {
                defaultMessage: 'No matching categories. Press Enter to search with this text.',
              }
            )}
            onChange={(options) => {
              const selected = options.find((option) => option.checked === 'on');
              if (selected?.key) {
                selectDomainSuggestion(selected.key as DataDomain);
              }
            }}
            renderOption={(option) => (
              <div>
                <EuiText size="s">
                  <strong>{option.label}</strong>
                </EuiText>
                {option.description ? (
                  <EuiText size="xs" color="subdued">
                    {option.description}
                  </EuiText>
                ) : null}
              </div>
            )}
            listProps={{
              rowHeight: 56,
              showIcons: true,
              id: MEASURE_SUGGESTIONS_LIST_ID,
            }}
            data-test-subj="mixedRulesMeasureSuggestions"
          >
            {(list) => list}
          </EuiSelectable>
        </EuiInputPopover>
      )}
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          {isAiMode ? (
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.aiModeHint"
              defaultMessage="Submit to start the AI agent with the rule-management skill and your description."
            />
          ) : activeDomain ? (
            activeDomain.hint
          ) : (
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.createHint"
              defaultMessage="Start with a guided builder, write an ES|QL query, or turn on AI mode to describe what you want."
            />
          )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      {prefersClassic && !isAiMode ? (
        <ClassicContinueCard
          title={i18n.translate('xpack.observabilityAlerting.mixedCreate.continueClassicTitle', {
            defaultMessage: 'Continue in Classic',
          })}
          description={
            classicSuggestions.length > 0
              ? i18n.translate(
                  'xpack.observabilityAlerting.mixedCreate.continueClassicDescriptionWithSuggestions',
                  {
                    defaultMessage:
                      'Pick a matching rule type below, or open the full Classic list.',
                  }
                )
              : i18n.translate(
                  'xpack.observabilityAlerting.mixedCreate.continueClassicDescription',
                  {
                    defaultMessage:
                      'Browse Classic rule types and templates for this data domain.',
                  }
                )
          }
          suggestions={classicSuggestions}
          onBrowseAll={() => onBrowseClassic(classicBrowseSearch)}
          onSelectRuleType={onSelectClassicRuleType}
          data-test-subj="mixedRulesContinueClassic"
        />
      ) : (
        <>
          <EuiHorizontalRule margin="s" />
          {suggestedTemplates.length > 0 ? (
            <>
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.suggestedTemplatesSection"
                    defaultMessage="Suggested templates"
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.suggestedTemplatesHint"
                  defaultMessage="Pre-configured templates from our rule library"
                />
              </EuiText>
              <EuiSpacer size="s" />
              <div css={optionCardStyles.stack} data-test-subj="mixedRulesSuggestedTemplates">
                {suggestedTemplates.map((template) => (
                  <FeaturedOptionCard
                    key={template.id}
                    iconType={template.iconType}
                    title={template.title}
                    description={template.description}
                    onClick={() => onSelectDemoTemplate(template)}
                    data-test-subj={`mixedRulesSuggestedTemplate-${template.id}`}
                  />
                ))}
              </div>
              <EuiSpacer size="m" />
            </>
          ) : null}
          {builderCards.length > 0 ? (
            <>
              <EuiText size="xs">
                <strong>{createSectionTitle}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <div css={optionCardStyles.stack}>{builderCards}</div>
            </>
          ) : null}
          {showBuildYourOwnSection ? (
            <>
              {builderCards.length > 0 ? <EuiSpacer size="m" /> : null}
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.buildYourOwnSection"
                    defaultMessage="Build your own"
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="s" />
              <div css={optionCardStyles.stack}>
                {showEsqlCard ? createOptionById.esql : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  );
};
