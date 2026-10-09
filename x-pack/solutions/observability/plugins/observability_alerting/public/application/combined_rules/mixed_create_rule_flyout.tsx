/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  euiCanAnimate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDebounceFn } from '@kbn/react-hooks';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useFindTemplatesQuery } from '@kbn/response-ops-rules-apis/hooks/use_find_templates_query';
import type { CoreStart } from '@kbn/core/public';
import { AiButton } from '@kbn/ui-ai-components';
import { SparklesIcon } from './sparkles_icon';

const TITLE_ID = 'mixedCreateRuleFlyoutTitle';
const CLASSIC_TITLE_ID = 'mixedClassicRuleTypesFlyoutTitle';
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

const classicContinueCardStyles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css({
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          padding: `${euiTheme.size.m} ${euiTheme.size.base}`,
          textAlign: 'left',
          cursor: 'pointer',
          // Match EuiFlyoutFooter background
          backgroundColor: euiTheme.components.flyoutFooterBackground,
          borderColor: euiTheme.colors.borderBasePlain,
        })
      : // required for unit tests to pass
        undefined,
  textColumn: css({
    minWidth: 0,
  }),
};

const ClassicContinueCard = ({
  title,
  description,
  onClick,
  'data-test-subj': dataTestSubj,
}: {
  title: string;
  description: string;
  onClick: () => void;
  'data-test-subj': string;
}) => (
  <EuiPanel
    element="button"
    hasBorder
    paddingSize="none"
    onClick={onClick}
    data-test-subj={dataTestSubj}
    css={classicContinueCardStyles.panel}
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

type DataDomain = 'infra' | 'apm' | 'logs' | 'synthetics' | 'slo' | 'custom' | 'specific';
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
  hint: string;
  examplePrompt: string;
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
      defaultMessage: 'APM and ML rules are only supported in Classic alerting.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainApmExample', {
      defaultMessage: 'APM',
    }),
  },
  {
    id: 'logs',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogs', {
      defaultMessage: 'Logs',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsDescription', {
      defaultMessage: 'Error counts, patterns, or anomalies in log data',
    }),
    createPaths: ['threshold', 'esql'],
    hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsHint', {
      defaultMessage:
        'Use Threshold for counts, ES|QL for custom queries, or AI mode to describe what you want.',
    }),
    examplePrompt: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainLogsExample', {
      defaultMessage: 'Error counts, patterns, or anomalies in log data',
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
  hint: i18n.translate('xpack.observabilityAlerting.mixedCreate.domainSpecificHint', {
    defaultMessage: 'Turn on AI mode to describe it, or start from a Threshold builder.',
  }),
  examplePrompt: '',
};

/**
 * Prototype-only keyword matching to reshape recommendations from free text.
 * Classic is for APM + ML only. Threshold-style intents (metric / log / index
 * threshold) stay on the Universal Threshold builder.
 */
const inferDataDomain = (text: string): DataDomain | null => {
  const value = text.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (/\b(apm|transaction|span|trace|latency|throughput)\b/.test(value)) {
    return 'apm';
  }
  if (/\b(ml|anomaly|machine learning)\b/.test(value)) {
    return 'apm';
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

const measureSearchStyles = {
  /** Matches Discover "Query with AI" sparkle twinkle on hover/focus. */
  aiButtonSparkleHover: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css`
          overflow: visible;

          &::after {
            content: none;
          }

          @keyframes mixedCreateSparkleTwinkle {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.45;
              transform: scale(0.85);
            }
          }

          ${euiCanAnimate} {
            &:hover svg path,
            &:focus-visible svg path {
              transform-box: fill-box;
              transform-origin: center;
              animation-name: mixedCreateSparkleTwinkle;
              animation-duration: calc(${euiTheme.animation.extraSlow} * 2);
              animation-timing-function: ease-in-out;
              animation-iteration-count: infinite;
            }

            &:hover svg path:nth-of-type(2),
            &:focus-visible svg path:nth-of-type(2) {
              animation-delay: ${euiTheme.animation.slow};
            }

            &:hover svg path:nth-of-type(3),
            &:focus-visible svg path:nth-of-type(3) {
              animation-delay: ${euiTheme.animation.extraSlow};
            }
          }
        `
      : // required for unit tests to pass
        undefined,
  aiButtonSelected: ({ euiTheme }: UseEuiTheme) =>
    euiTheme
      ? css`
          background: linear-gradient(
            180deg,
            ${euiTheme.components.buttons.backgroundPrimaryHover} 18%,
            ${euiTheme.components.buttons.backgroundAssistanceHover} 83%
          ) !important;
        `
      : // required for unit tests to pass
        undefined,
};

const V2OptionsBody = ({
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  showClassic,
}: {
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  showClassic: boolean;
}) => {
  const [measureText, setMeasureText] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DataDomain | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const inferredDomain = useMemo(() => inferDataDomain(measureText), [measureText]);
  const activeDomainId = selectedDomain ?? inferredDomain;
  const activeDomain =
    activeDomainId === 'specific'
      ? SPECIFIC_DOMAIN_FALLBACK
      : DATA_DOMAIN_OPTIONS.find((option) => option.id === activeDomainId) ?? null;

  const prefersClassic = Boolean(activeDomain?.prefersClassic && showClassic);
  const createPathIds = activeDomain?.createPaths ?? DEFAULT_CREATE_PATHS;

  const domainSuggestionOptions = useMemo<DomainSuggestionOption[]>(
    () =>
      DATA_DOMAIN_OPTIONS.map((option) => ({
        label: option.label,
        key: option.id,
        description: option.description,
        checked: selectedDomain === option.id ? ('on' as const) : undefined,
        'data-test-subj': `mixedRulesDomain-${option.id}`,
      })),
    [selectedDomain]
  );

  const selectDomainSuggestion = (domain: DataDomain) => {
    const option = DATA_DOMAIN_OPTIONS.find((item) => item.id === domain);
    setSelectedDomain(domain);
    // Main title goes in the search field — Classic rule-type filter needs it
    // (e.g. "SLOs", "APM"), not the longer description.
    setMeasureText(option?.classicSearch ?? option?.label ?? '');
    setIsSuggestionsOpen(false);
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

  const onMeasureTextChange = (value: string) => {
    setMeasureText(value);
    const normalized = value.trim().toLowerCase();
    const matchingSuggestion = DATA_DOMAIN_OPTIONS.find(
      (option) =>
        option.classicSearch?.toLowerCase() === normalized ||
        option.label.toLowerCase() === normalized ||
        option.examplePrompt.toLowerCase() === normalized ||
        option.description.toLowerCase() === normalized
    );
    setSelectedDomain(matchingSuggestion?.id ?? null);
  };

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
      <LargeOptionCard
        key="esql"
        iconType="code"
        title={i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlTitle', {
          defaultMessage: 'ES|QL',
        })}
        description={i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlDescription', {
          defaultMessage: 'Create a rule from an ES|QL query with live preview.',
        })}
        onClick={onChooseEsql}
        data-test-subj="mixedRulesChooseEsql"
      />
    ),
  };

  const createCards = createPathIds.map((id) => createOptionById[id]);

  const onMeasureSearch = (value: string) => {
    if (isAiMode) {
      onChooseAgent(value.trim() || undefined);
    }
  };

  return (
    <>
      <EuiText size="s">
        <strong>
          <FormattedMessage
            id="xpack.observabilityAlerting.mixedCreate.measureQuestion"
            defaultMessage="What do you want to measure?"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem>
              {isAiMode ? (
                <EuiFieldSearch
                  fullWidth
                  compressed
                  value={measureText}
                  onChange={(event) => onMeasureTextChange(event.target.value)}
                  // Only fires on Enter when incremental is off — avoids starting the agent while typing.
                  onSearch={onMeasureSearch}
                  placeholder={i18n.translate(
                    'xpack.observabilityAlerting.mixedCreate.aiModePlaceholder',
                    {
                      defaultMessage: 'Describe the query you want in natural language',
                    }
                  )}
                  data-test-subj="mixedRulesMeasureSearch"
                />
              ) : (
                <EuiInputPopover
                  fullWidth
                  disableFocusTrap
                  panelPaddingSize="none"
                  isOpen={isSuggestionsOpen}
                  closePopover={() => setIsSuggestionsOpen(false)}
                  input={
                    <EuiFieldSearch
                      fullWidth
                      compressed
                      value={measureText}
                      onChange={(event) => {
                        onMeasureTextChange(event.target.value);
                        setIsSuggestionsOpen(true);
                      }}
                      onFocus={() => setIsSuggestionsOpen(true)}
                      placeholder={i18n.translate(
                        'xpack.observabilityAlerting.mixedCreate.measurePlaceholder',
                        {
                          defaultMessage:
                            'Search or pick a suggestion — metrics, APM, logs, synthetics, SLOs…',
                        }
                      )}
                      data-test-subj="mixedRulesMeasureSearch"
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
                    options={domainSuggestionOptions}
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
                    listProps={{ rowHeight: 56, showIcons: true }}
                    data-test-subj="mixedRulesMeasureSuggestions"
                  >
                    {(list) => list}
                  </EuiSelectable>
                </EuiInputPopover>
              )}
            </EuiFlexItem>
            {isAiMode ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.observabilityAlerting.mixedCreate.submitTooltip', {
                    defaultMessage: 'Submit',
                  })}
                >
                  <EuiButtonIcon
                    size="s"
                    iconType="return"
                    color="primary"
                    display="base"
                    aria-label={i18n.translate(
                      'xpack.observabilityAlerting.mixedCreate.submitLabel',
                      {
                        defaultMessage: 'Submit',
                      }
                    )}
                    onClick={() => onMeasureSearch(measureText)}
                    data-test-subj="mixedRulesMeasureSubmit"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.observabilityAlerting.mixedCreate.aiModeTooltip', {
              defaultMessage: 'Describe a rule in natural language with the AI agent',
            })}
          >
            <AiButton
              size="s"
              variant="outlined"
              iconType={SparklesIcon as unknown as 'sparkles'}
              aria-pressed={isAiMode}
              isSelected={isAiMode}
              onClick={() => {
                setIsAiMode((current) => {
                  const next = !current;
                  if (!next) {
                    setSelectedDomain(null);
                    setMeasureText('');
                    setIsSuggestionsOpen(false);
                  }
                  return next;
                });
              }}
              data-test-subj="mixedRulesAiMode"
              css={[
                measureSearchStyles.aiButtonSparkleHover,
                isAiMode ? measureSearchStyles.aiButtonSelected : undefined,
              ]}
            >
              {i18n.translate('xpack.observabilityAlerting.mixedCreate.aiModeLabel', {
                defaultMessage: 'Ask Agent',
              })}
            </AiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
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
          description={i18n.translate(
            'xpack.observabilityAlerting.mixedCreate.continueClassicDescription',
            {
              defaultMessage:
                'Browse Classic rule types and templates for this data domain.',
            }
          )}
          onClick={() => onBrowseClassic(classicBrowseSearch)}
          data-test-subj="mixedRulesContinueClassic"
        />
      ) : (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.createSection"
                defaultMessage="Create"
              />
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <div css={optionCardStyles.stack}>{createCards}</div>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.rulesOnRulesSection"
                defaultMessage="Rules on Rules"
              />
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <div css={optionCardStyles.stack}>
            <FeaturedOptionCard
              iconType="branch"
              title={i18n.translate('xpack.observabilityAlerting.mixedCreate.sequenceTitle', {
                defaultMessage: 'Sequence',
              })}
              description={i18n.translate(
                'xpack.observabilityAlerting.mixedCreate.sequenceDescription',
                {
                  defaultMessage: 'Chain rules for multi-step patterns.',
                }
              )}
              onClick={onChooseSequence}
              badge={<ExperimentalBadge />}
              data-test-subj="mixedRulesChooseSequence"
            />
          </div>
        </>
      )}
    </>
  );
};
