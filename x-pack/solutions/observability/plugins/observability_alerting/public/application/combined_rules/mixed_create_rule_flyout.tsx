/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCard,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDebounceFn } from '@kbn/react-hooks';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useFindTemplatesQuery } from '@kbn/response-ops-rules-apis/hooks/use_find_templates_query';
import { AiButton } from '@kbn/ui-ai-components';
import type { CoreStart } from '@kbn/core/public';
import type { IdleBuilderPresentation } from './mixed_create_prototype_settings';

const TITLE_ID = 'mixedCreateRuleFlyoutTitle';
const CLASSIC_TITLE_ID = 'mixedClassicRuleTypesFlyoutTitle';
const MEASURE_SUGGESTIONS_LIST_ID = 'mixedRulesMeasureSuggestionsList';
/** Title + description option rows (EUI default 32 overlaps). */
const SUGGESTION_OPTION_ROW_HEIGHT = 48;
/** Compact group labels (Universal / templates) — no divider band. */
const SUGGESTION_GROUP_LABEL_HEIGHT = 32;
/** Classic group — EUI default rowHeight + 16px divider/padding band. */
const SUGGESTION_GROUP_LABEL_WITH_DIVIDER_HEIGHT = SUGGESTION_OPTION_ROW_HEIGHT + 16;
const SEARCH_DEBOUNCE = { wait: 300 };

/** Match Workflows agentic-first landing: keep content readable when the flyout is maximized. */
const maximizedFlyoutContentCss = css`
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
`;

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

type RuleBuilderType = 'threshold' | 'sequence' | 'esql';

const RULE_BUILDER_BADGE: Record<
  RuleBuilderType,
  { label: string; iconType: string }
> = {
  threshold: {
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.builderBadge.threshold', {
      defaultMessage: 'Threshold',
    }),
    iconType: 'puzzlePiece',
  },
  sequence: {
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.builderBadge.sequence', {
      defaultMessage: 'Sequence',
    }),
    iconType: 'puzzlePiece',
  },
  esql: {
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.builderBadge.esql', {
      defaultMessage: 'ES|QL',
    }),
    iconType: 'code',
  },
};

const IDLE_BUILDER_STARTERS: Array<{
  id: 'threshold' | 'sequence';
  title: string;
  iconType: string;
  testSubj: string;
}> = [
  {
    id: 'threshold',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.idleBuilder.threshold', {
      defaultMessage: 'Monitor a threshold',
    }),
    iconType: RULE_BUILDER_BADGE.threshold.iconType,
    testSubj: 'mixedRulesChooseThreshold',
  },
  {
    id: 'sequence',
    title: i18n.translate('xpack.observabilityAlerting.mixedCreate.idleBuilder.sequence', {
      defaultMessage: 'Build a sequence',
    }),
    iconType: RULE_BUILDER_BADGE.sequence.iconType,
    testSubj: 'mixedRulesChooseSequence',
  },
];

const IdleBuilderStarters = ({
  presentation,
  onChooseThreshold,
  onChooseSequence,
  onChooseEsql,
}: {
  presentation: IdleBuilderPresentation;
  onChooseThreshold: () => void;
  onChooseSequence: () => void;
  onChooseEsql: () => void;
}) => {
  const onChooseById = (id: 'threshold' | 'sequence') => {
    if (id === 'threshold') {
      onChooseThreshold();
      return;
    }
    onChooseSequence();
  };

  const writeEsqlButton = (
    <EuiButtonEmpty
      size="s"
      color="primary"
      flush="both"
      iconType="code"
      iconSide="left"
      onClick={onChooseEsql}
      data-test-subj="mixedRulesChooseEsql"
      aria-label={i18n.translate(
        'xpack.observabilityAlerting.mixedCreate.writeYourOwnQueryAria',
        { defaultMessage: 'Write your own ES|QL query' }
      )}
    >
      <FormattedMessage
        id="xpack.observabilityAlerting.mixedCreate.writeEsqlLink"
        defaultMessage="Write ES|QL query"
      />
    </EuiButtonEmpty>
  );

  if (presentation === 'badge') {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
        data-test-subj="mixedRulesHelpMeBuild"
        data-builder-presentation="badge"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {IDLE_BUILDER_STARTERS.map((starter) => (
              <EuiFlexItem grow={false} key={starter.id}>
                <EuiBadge
                  color="hollow"
                  iconType={starter.iconType}
                  onClick={() => onChooseById(starter.id)}
                  onClickAriaLabel={starter.title}
                  data-test-subj={starter.testSubj}
                >
                  {starter.title}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{writeEsqlButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
      responsive={false}
      wrap
      data-test-subj="mixedRulesHelpMeBuild"
      data-builder-presentation="panel"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          {IDLE_BUILDER_STARTERS.map((starter) => (
            <EuiFlexItem grow={false} key={starter.id}>
              <EuiPanel
                element="button"
                paddingSize="s"
                hasBorder
                hasShadow={false}
                onClick={() => onChooseById(starter.id)}
                data-test-subj={starter.testSubj}
                aria-label={starter.title}
                css={css`
                  min-width: 180px;
                `}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={starter.iconType} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{starter.title}</strong>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{writeEsqlButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RuleLibraryCardTags = ({
  tags,
  builderType,
}: {
  tags: string[];
  builderType: RuleBuilderType;
}) => {
  const visibleTags = tags.slice(0, 1);
  const overflowCount = tags.length - visibleTags.length;
  const builderBadge = RULE_BUILDER_BADGE[builderType];

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      {visibleTags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
      {overflowCount > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">+{overflowCount}</EuiBadge>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiBadge color="primary" iconType={builderBadge.iconType}>
          {builderBadge.label}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const RuleLibraryCard = ({
  iconType,
  title,
  description,
  tags,
  builderType,
  onClick,
  compact,
  'data-test-subj': dataTestSubj,
}: {
  iconType: string;
  title: string;
  description: string;
  tags: string[];
  builderType: RuleBuilderType;
  onClick: () => void;
  /** Compact horizontal row for the stacked flyout; vertical Workflows-style when maximized. */
  compact: boolean;
  'data-test-subj': string;
}) => {
  const { euiTheme } = useEuiTheme();
  const hoverShadow = useEuiShadow('s');

  const cardCss = useMemo(
    () => css`
      transition: box-shadow ${euiTheme.animation.fast} ease-in;
      &:hover,
      &:focus-within {
        ${hoverShadow}
      }
      [class*='euiCard__footer'] {
        margin-top: ${euiTheme.size.s};
      }
    `,
    [hoverShadow, euiTheme.animation.fast, euiTheme.size.s]
  );

  const tagsRow = <RuleLibraryCardTags tags={tags} builderType={builderType} />;

  if (compact) {
    return (
      <EuiPanel
        element="button"
        hasBorder
        paddingSize="s"
        onClick={onClick}
        data-test-subj={dataTestSubj}
        css={css`
          width: 100%;
          text-align: left;
          cursor: pointer;
          background: ${euiTheme.colors.emptyShade};
          border-color: ${euiTheme.colors.lightShade};
          box-shadow: none;
          transition: box-shadow ${euiTheme.animation.fast} ease-in;
          &:hover,
          &:focus {
            ${hoverShadow}
          }
        `}
      >
        <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" color="text" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                margin-top: ${euiTheme.size.xs};
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              `}
            >
              {description}
            </EuiText>
            <EuiSpacer size="xs" />
            {tagsRow}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const cardTitle = (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="l" color="text" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="m"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >
          {title}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const cardDescription = (
    <span
      css={css`
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      `}
    >
      {description}
    </span>
  );

  return (
    <EuiCard
      layout="vertical"
      textAlign="left"
      paddingSize="m"
      hasBorder
      onClick={onClick}
      title={cardTitle}
      description={cardDescription}
      footer={tagsRow}
      data-test-subj={dataTestSubj}
      css={[
        css({
          background: euiTheme.colors.emptyShade,
          borderColor: euiTheme.colors.lightShade,
          boxShadow: 'none',
          gap: euiTheme.size.s,
          minHeight: 168,
          width: '100%',
          height: '100%',
        }),
        cardCss,
      ]}
    />
  );
};

export const MixedCreateRuleFlyout = ({
  onClose,
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  onExploreLibrary,
  onSelectClassicRuleType,
  onMaximizeChange,
  showClassic,
  compactAskAnything = false,
  idleBuilderPresentation = 'panel',
  showClassicIdleFooter = true,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
}: {
  onClose: () => void;
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string, esqlQuery?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onExploreLibrary: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onMaximizeChange?: (isMaximized: boolean) => void;
  showClassic: boolean;
  /** Prototype: compact idle field that grows with typed content. */
  compactAskAnything?: boolean;
  /** Prototype: how Threshold / Sequence starters render. */
  idleBuilderPresentation?: IdleBuilderPresentation;
  /** Prototype: idle Classic footer panel. */
  showClassicIdleFooter?: boolean;
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
        onExploreLibrary={onExploreLibrary}
        onSelectClassicRuleType={onSelectClassicRuleType}
        onMaximizeChange={onMaximizeChange}
        showClassic={showClassic}
        compactAskAnything={compactAskAnything}
        idleBuilderPresentation={idleBuilderPresentation}
        showClassicIdleFooter={showClassicIdleFooter}
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
  onExploreLibrary,
  onSelectClassicRuleType,
  onMaximizeChange,
  showClassic,
  compactAskAnything,
  idleBuilderPresentation,
  showClassicIdleFooter,
  http,
  toasts,
  registeredRuleTypes,
  historyKey,
}: {
  onClose: () => void;
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string, esqlQuery?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onExploreLibrary: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onMaximizeChange?: (isMaximized: boolean) => void;
  showClassic: boolean;
  compactAskAnything: boolean;
  idleBuilderPresentation: IdleBuilderPresentation;
  showClassicIdleFooter: boolean;
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
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMaximizeChange = useCallback(
    (maximized: boolean) => {
      setIsMaximized(maximized);
      onMaximizeChange?.(maximized);
    },
    [onMaximizeChange]
  );

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
        showMaximizeButton: true,
        onMaximizeChange: handleMaximizeChange,
      }}
      data-test-subj="mixedRulesExperienceChooser"
    >
      <EuiFlyoutHeader>
        <div css={isMaximized ? maximizedFlyoutContentCss : undefined}>
          <EuiTitle size="s" id={TITLE_ID}>
            <h2>
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.title"
                defaultMessage="Create rule"
              />
            </h2>
          </EuiTitle>
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <MixedCreateChooserBody
          onChooseThreshold={onChooseThreshold}
          onChooseEsql={onChooseEsql}
          onChooseAgent={onChooseAgent}
          onChooseSequence={onChooseSequence}
          onBrowseClassic={onBrowseClassic}
          onExploreLibrary={onExploreLibrary}
          onSelectClassicRuleType={onSelectClassicRuleType}
          classicRuleTypes={[...ruleTypeIndex.values()].map((ruleType) => ({
            id: ruleType.id,
            name: ruleType.name,
            description: ruleType.description,
          }))}
          showClassic={showClassic}
          isMaximized={isMaximized}
          compactAskAnything={compactAskAnything}
          idleBuilderPresentation={idleBuilderPresentation}
          showClassicIdleFooter={showClassicIdleFooter}
        />
      </EuiFlyoutBody>
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
  initialIsMaximized = false,
  onMaximizeChange,
}: {
  onClose: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
  initialSearch?: string;
  /** Match the Create rule flyout size when stacking Classic on top. */
  initialIsMaximized?: boolean;
  onMaximizeChange?: (isMaximized: boolean) => void;
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
        initialIsMaximized={initialIsMaximized}
        onMaximizeChange={onMaximizeChange}
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
  initialIsMaximized,
  onMaximizeChange,
}: {
  onClose: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  registeredRuleTypes: Array<{ id: string; description: string }>;
  historyKey: symbol;
  initialSearch: string;
  initialIsMaximized: boolean;
  onMaximizeChange?: (isMaximized: boolean) => void;
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedMode, setSelectedMode] = useState<ClassicChooserMode>('ruleType');
  const [isMaximized, setIsMaximized] = useState(initialIsMaximized);
  const didApplyInitialMaximize = useRef(false);
  const { run: updateDebouncedSearch } = useDebounceFn(setDebouncedSearch, SEARCH_DEBOUNCE);

  const handleMaximizeChange = useCallback(
    (maximized: boolean) => {
      setIsMaximized(maximized);
      onMaximizeChange?.(maximized);
    },
    [onMaximizeChange]
  );

  // EUI has no public initialIsMaximized; apply Create's size by clicking Maximize once.
  useLayoutEffect(() => {
    if (!initialIsMaximized || didApplyInitialMaximize.current) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryMaximize = () => {
      if (cancelled || didApplyInitialMaximize.current) {
        return;
      }
      const maximizeButton = document.querySelector<HTMLElement>(
        '[data-test-subj="mixedRulesClassicChooser"] [data-test-subj="euiFlyoutMenuMaximizeButton"]'
      );
      if (maximizeButton) {
        didApplyInitialMaximize.current = true;
        maximizeButton.click();
        return;
      }
      attempts += 1;
      if (attempts < 10) {
        window.requestAnimationFrame(tryMaximize);
      }
    };
    tryMaximize();
    return () => {
      cancelled = true;
    };
  }, [initialIsMaximized]);

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
        showMaximizeButton: true,
        onMaximizeChange: handleMaximizeChange,
      }}
      data-test-subj="mixedRulesClassicChooser"
    >
      <EuiFlyoutHeader hasBorder>
        <div css={isMaximized ? maximizedFlyoutContentCss : undefined}>
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
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div
          css={isMaximized ? maximizedFlyoutContentCss : undefined}
          data-test-subj="mixedRulesClassicBody"
          data-maximized={isMaximized ? 'true' : 'false'}
        >
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
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

/**
 * Demo-only v2 rule-library templates. Real templates will come from the API later.
 */
type DemoRuleTemplate = {
  id: string;
  title: string;
  description: string;
  iconType: string;
  /** Builder the template opens (shown as the accent badge). */
  createPath: RuleBuilderType;
  /** Topic tags only — builder type is rendered separately. */
  tags: string[];
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
    tags: ['infrastructure'],
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
    createPath: 'sequence',
    tags: ['infrastructure'],
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
    tags: ['infrastructure', 'capacity'],
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
    tags: ['logs'],
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
    tags: ['logs', 'security'],
  },
];

const IDLE_SUGGESTED_TEMPLATE_IDS = [
  'demo-high-cpu',
  'demo-memory-pressure',
  'demo-error-log-spike',
] as const;

/** Fixed starter templates — body stays stable while search only drives the typeahead. */
const getIdleSuggestedTemplates = (): DemoRuleTemplate[] =>
  IDLE_SUGGESTED_TEMPLATE_IDS.flatMap((id) => {
    const template = DEMO_RULE_TEMPLATES.find((item) => item.id === id);
    return template ? [template] : [];
  });

type DomainSuggestionOption = EuiSelectableOption & {
  description?: string;
};

const looksLikeEsqlOrStructuredQuery = (text: string): boolean => {
  const value = text.trim().toLowerCase();
  return (
    /\b(from |stats |where |esql)\b/.test(value) ||
    value.includes('|') ||
    value.includes('*')
  );
};

/** Prototype heuristic used by domain inference for free-text measure queries. */
const looksLikeDescriptiveNaturalLanguage = (text: string): boolean => {
  const value = text.trim();
  if (!value || looksLikeEsqlOrStructuredQuery(value)) {
    return false;
  }

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 3 && value.length < 20) {
    return false;
  }

  const hasIntentLanguage =
    /\b(i|we|my|our|want|need|like|looking|try|trying|help|please|alert|notify|detect|create|make|set\s*up|when|whenever|if|why|how|should|describe|something|someone)\b/i.test(
      value
    ) || /\?$/.test(value);

  // Sentence-like free text without a clear keyword-only shape.
  return hasIntentLanguage || words.length >= 4 || value.length >= 28;
};

/**
 * Keyword domain inference from typing. Reserved for future domain-aware template
 * filtering — not shown as typeahead rows and does not reshape the idle body.
 */
type InferredDataDomain = 'infra' | 'apm' | 'logs' | 'synthetics' | 'slo' | 'specific';

const inferDataDomain = (text: string): InferredDataDomain | null => {
  const value = text.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (/\b(apm|transaction|span|trace|latency|throughput)\b/.test(value)) {
    return 'apm';
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
  if (/\b(metric threshold|log threshold|index threshold)\b/.test(value)) {
    return /\blog threshold\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\bthreshold\b/.test(value)) {
    return /\blog\b/.test(value) ? 'logs' : 'infra';
  }
  if (/\b(log|logs|error message|stacktrace)\b/.test(value)) {
    return 'logs';
  }
  if (/\b(cpu|memory|disk|host|container|pod|infra|metric)\b/.test(value)) {
    return 'infra';
  }
  if (looksLikeDescriptiveNaturalLanguage(text) || value.length >= 12) {
    return 'specific';
  }
  return null;
};

const CLASSIC_SUGGESTION_KEY_PREFIX = 'classic:';
const PATH_SUGGESTION_KEY_PREFIX = 'path:';
const TEMPLATE_SUGGESTION_KEY_PREFIX = 'template:';
const UNIVERSAL_GROUP_KEY = 'group:universal';
const TEMPLATE_GROUP_KEY = 'group:templates';
const CLASSIC_GROUP_KEY = 'group:classic';

type CreatePathSuggestionId = 'threshold' | 'sequence' | 'esql';

type AskAnythingSuggestionOption = DomainSuggestionOption & {
  suggestionKind?: 'classic' | 'path' | 'template' | 'group';
  isGroupLabel?: boolean;
};

const CREATE_PATH_SUGGESTIONS: Array<{
  id: CreatePathSuggestionId;
  label: string;
  description: string;
  iconType: string;
  keywords: string[];
}> = [
  {
    id: 'threshold',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.idleBuilder.threshold', {
      defaultMessage: 'Monitor a threshold',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.thresholdPathHint', {
      defaultMessage: 'Guided builder for counts and metric thresholds',
    }),
    iconType: 'puzzlePiece',
    keywords: ['threshold', 'count', 'metric', 'builder'],
  },
  {
    id: 'sequence',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.idleBuilder.sequence', {
      defaultMessage: 'Build a sequence',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.sequencePathHint', {
      defaultMessage: 'Guided builder for multi-step patterns',
    }),
    iconType: 'puzzlePiece',
    keywords: ['sequence', 'chain', 'multi-step', 'builder'],
  },
  {
    id: 'esql',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlTitle', {
      defaultMessage: 'ES|QL rule',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.esqlPathHint', {
      defaultMessage: 'Write your own ES|QL query',
    }),
    iconType: 'code',
    keywords: ['esql', 'query', 'sql', 'manual'],
  },
];

export type MixedCreateChooserBodyProps = {
  onChooseThreshold: () => void;
  onChooseEsql: () => void;
  onChooseAgent: (userInput?: string, esqlQuery?: string) => void;
  onChooseSequence: () => void;
  onBrowseClassic: (search?: string) => void;
  onExploreLibrary: () => void;
  onSelectClassicRuleType: (ruleTypeId: string) => void;
  classicRuleTypes: Array<{ id: string; name: string; description?: string }>;
  showClassic: boolean;
  isMaximized: boolean;
  compactAskAnything: boolean;
  idleBuilderPresentation: IdleBuilderPresentation;
  showClassicIdleFooter: boolean;
};

/** Shared create-rule chooser body used by the MixedCreate flyout. */
export const MixedCreateChooserBody = ({
  onChooseThreshold,
  onChooseEsql,
  onChooseAgent,
  onChooseSequence,
  onBrowseClassic,
  onExploreLibrary,
  onSelectClassicRuleType,
  classicRuleTypes,
  showClassic,
  isMaximized,
  compactAskAnything: _compactAskAnything,
  idleBuilderPresentation,
  showClassicIdleFooter,
}: MixedCreateChooserBodyProps) => {
  const { euiTheme } = useEuiTheme();
  const [measureText, setMeasureText] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  // Popover close refocuses the input; ignore that one focus so Escape stay closed.
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

  const measureQuery = measureText.trim().toLowerCase();
  const hasSearchQuery = measureQuery.length > 0;
  const classicBrowseSearch = measureText.trim() || undefined;

  const onBrowseClassicFromSuggestions = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement> | React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions({ suppressFocusReopen: true });
      onBrowseClassic(classicBrowseSearch);
    },
    [classicBrowseSearch, onBrowseClassic]
  );

  // Kept for future domain-aware template filtering; not used to reshape the idle body.
  const inferredDomain = useMemo(() => inferDataDomain(measureText), [measureText]);

  const suggestionOptions = useMemo<AskAnythingSuggestionOption[]>(() => {
    if (!hasSearchQuery) {
      return [];
    }

    const pathOptions: AskAnythingSuggestionOption[] = CREATE_PATH_SUGGESTIONS.filter((path) => {
      const haystack =
        `${path.label} ${path.description} ${path.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(measureQuery);
    }).map((path) => ({
      label: path.label,
      key: `${PATH_SUGGESTION_KEY_PREFIX}${path.id}`,
      description: path.description,
      suggestionKind: 'path' as const,
      prepend: <EuiIcon type={path.iconType} />,
      'data-test-subj': `mixedRulesPathSuggestion-${path.id}`,
    }));

    const templateOptions: AskAnythingSuggestionOption[] = DEMO_RULE_TEMPLATES.filter(
      (template) => {
        const haystack =
          `${template.title} ${template.description} ${template.tags.join(' ')}`.toLowerCase();
        return haystack.includes(measureQuery);
      }
    ).map((template) => ({
      label: template.title,
      key: `${TEMPLATE_SUGGESTION_KEY_PREFIX}${template.id}`,
      description: template.description,
      suggestionKind: 'template' as const,
      'data-test-subj': `mixedRulesTemplateSuggestion-${template.id}`,
    }));

    const classicRuleOptions: AskAnythingSuggestionOption[] =
      showClassic && measureQuery.length >= 2
        ? classicRuleTypes
            .filter((ruleType) => {
              const name = ruleType.name.toLowerCase();
              const description = (ruleType.description ?? '').toLowerCase();
              return name.includes(measureQuery) || description.includes(measureQuery);
            })
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((ruleType) => ({
              label: ruleType.name,
              key: `${CLASSIC_SUGGESTION_KEY_PREFIX}${ruleType.id}`,
              description: ruleType.description,
              suggestionKind: 'classic' as const,
              'data-test-subj': `mixedRulesClassicSuggestion-${ruleType.id}`,
            }))
        : [];

    const options: AskAnythingSuggestionOption[] = [];

    if (pathOptions.length > 0) {
      options.push({
        label: i18n.translate('xpack.observabilityAlerting.mixedCreate.universalGroupLabel', {
          defaultMessage: 'Universal',
        }),
        key: UNIVERSAL_GROUP_KEY,
        suggestionKind: 'group',
        isGroupLabel: true,
        'data-test-subj': 'mixedRulesSuggestionGroup-universal',
      });
      options.push(...pathOptions);
    }

    if (templateOptions.length > 0) {
      options.push({
        label: i18n.translate('xpack.observabilityAlerting.mixedCreate.fromTemplatesGroupLabel', {
          defaultMessage: 'From templates',
        }),
        key: TEMPLATE_GROUP_KEY,
        suggestionKind: 'group',
        isGroupLabel: true,
        'data-test-subj': 'mixedRulesSuggestionGroup-templates',
      });
      options.push(...templateOptions);
    }

    if (classicRuleOptions.length > 0) {
      options.push({
        label: i18n.translate('xpack.observabilityAlerting.mixedCreate.classicGroupLabel', {
          defaultMessage: 'Classic rule types',
        }),
        key: CLASSIC_GROUP_KEY,
        suggestionKind: 'group',
        isGroupLabel: true,
        append: (
          <EuiLink
            onClick={onBrowseClassicFromSuggestions}
            data-test-subj="mixedRulesBrowseClassicFromSuggestions"
          >
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.exploreRuleTypesList"
              defaultMessage="Browse all"
            />
          </EuiLink>
        ),
        'data-test-subj': 'mixedRulesSuggestionGroup-classic',
      });
      options.push(...classicRuleOptions);
    }

    return options;
  }, [
    classicRuleTypes,
    hasSearchQuery,
    measureQuery,
    onBrowseClassicFromSuggestions,
    showClassic,
  ]);

  // Escape closes the portaled suggestion panel.
  useEffect(() => {
    if (!isSuggestionsOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions({ suppressFocusReopen: true });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isSuggestionsOpen]);

  const suggestedTemplates = useMemo(() => getIdleSuggestedTemplates(), []);

  const chooseCreatePath = (pathId: CreatePathSuggestionId) => {
    closeSuggestions({ suppressFocusReopen: true });
    if (pathId === 'threshold') {
      onChooseThreshold();
      return;
    }
    if (pathId === 'sequence') {
      onChooseSequence();
      return;
    }
    onChooseEsql();
  };

  const onSelectDemoTemplate = (template: DemoRuleTemplate) => {
    chooseCreatePath(template.createPath);
  };

  const selectTemplateSuggestion = (templateId: string) => {
    const template = DEMO_RULE_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    onSelectDemoTemplate(template);
  };

  const onSubmitToAgent = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    closeSuggestions({ suppressFocusReopen: true });
    onChooseAgent(trimmed);
  };

  const hasSelectableSuggestions = suggestionOptions.some((option) => !option.isGroupLabel);
  // Keep the popover open for any non-empty query so a no-results state can
  // still surface the agent footer.
  const areSuggestionsVisible = isSuggestionsOpen && hasSearchQuery;

  const getSuggestionItemSize = useCallback(
    (index: number) => {
      const option = suggestionOptions[index];
      if (!option?.isGroupLabel) {
        return SUGGESTION_OPTION_ROW_HEIGHT;
      }
      // Classic keeps EUI's divider band; other groups stay compact.
      return option.key === CLASSIC_GROUP_KEY
        ? SUGGESTION_GROUP_LABEL_WITH_DIVIDER_HEIGHT
        : SUGGESTION_GROUP_LABEL_HEIGHT;
    },
    [suggestionOptions]
  );

  return (
    <div
      css={isMaximized ? maximizedFlyoutContentCss : undefined}
      data-test-subj="mixedRulesCreateBody"
      data-inferred-domain={inferredDomain ?? undefined}
    >
      <EuiText size="m">
        <strong>
          <FormattedMessage
            id="xpack.observabilityAlerting.mixedCreate.measureQuestion"
            defaultMessage="What do you want to measure?"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiInputPopover
        fullWidth
        disableFocusTrap
        panelPaddingSize="s"
        isOpen={areSuggestionsVisible}
        closePopover={closeSuggestions}
        input={
          <EuiFieldSearch
            fullWidth
            incremental
            compressed={false}
            value={measureText}
            autoFocus={true}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setMeasureText(nextValue);
              if (nextValue.trim()) {
                openSuggestions();
              } else {
                closeSuggestions({ suppressFocusReopen: true });
              }
            }}
            onFocus={() => {
              if (suppressSuggestionsFocusOpenRef.current) {
                suppressSuggestionsFocusOpenRef.current = false;
                return;
              }
              if (measureText.trim()) {
                openSuggestions();
              }
            }}
            placeholder={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.askAnythingPlaceholder',
              {
                defaultMessage: 'Search builder, templates or describe a rule',
              }
            )}
            role="combobox"
            aria-expanded={areSuggestionsVisible}
            aria-controls={MEASURE_SUGGESTIONS_LIST_ID}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-label={i18n.translate(
              'xpack.observabilityAlerting.mixedCreate.askAnythingAriaLabel',
              {
                defaultMessage: 'Search for a rule to create',
              }
            )}
            data-test-subj="mixedRulesMeasureSearch"
          />
        }
      >
        <EuiSelectable<AskAnythingSuggestionOption>
          singleSelection
          isPreFiltered
          options={suggestionOptions}
          emptyMessage={<span />}
          noMatchesMessage={<span />}
          css={css`
            /*
             * Universal + templates: compact, no divider. Classic keeps EUI's
             * ::before rule and default padding (itemSize = rowHeight+16).
             */
            .euiSelectableList__groupLabel:not(
                [data-test-subj='mixedRulesSuggestionGroup-classic']
              ) {
              padding-block: ${euiTheme.size.xs};
              &::before {
                content: none !important;
              }
            }
            [data-test-subj='mixedRulesSuggestionGroup-classic'] {
              /* Group labels don't wrap append like list items — push Browse all right. */
              justify-content: space-between;
            }
          `}
          onChange={(options) => {
            const selected = options.find(
              (option) => option.checked === 'on' && !option.isGroupLabel
            );
            if (!selected?.key || selected.isGroupLabel || selected.suggestionKind === 'group') {
              return;
            }
            if (
              selected.suggestionKind === 'classic' ||
              selected.key.startsWith(CLASSIC_SUGGESTION_KEY_PREFIX)
            ) {
              onSelectClassicRuleType(selected.key.slice(CLASSIC_SUGGESTION_KEY_PREFIX.length));
              closeSuggestions({ suppressFocusReopen: true });
              return;
            }
            if (
              selected.suggestionKind === 'template' ||
              selected.key.startsWith(TEMPLATE_SUGGESTION_KEY_PREFIX)
            ) {
              selectTemplateSuggestion(selected.key.slice(TEMPLATE_SUGGESTION_KEY_PREFIX.length));
              return;
            }
            if (
              selected.suggestionKind === 'path' ||
              selected.key.startsWith(PATH_SUGGESTION_KEY_PREFIX)
            ) {
              chooseCreatePath(
                selected.key.slice(PATH_SUGGESTION_KEY_PREFIX.length) as CreatePathSuggestionId
              );
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
            rowHeight: SUGGESTION_OPTION_ROW_HEIGHT,
            showIcons: false,
            id: MEASURE_SUGGESTIONS_LIST_ID,
            // Override EUI's groupLabel = rowHeight+16 so titles stay compact.
            windowProps: {
              itemSize: getSuggestionItemSize,
            },
          }}
          data-test-subj="mixedRulesMeasureSuggestions"
        >
          {(list) => (
            <>
              {hasSelectableSuggestions ? (
                list
              ) : (
                <EuiText
                  size="s"
                  color="subdued"
                  textAlign="center"
                  data-test-subj="mixedRulesNoSuggestions"
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-block-size: ${SUGGESTION_OPTION_ROW_HEIGHT}px;
                  `}
                >
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.noSearchSuggestions"
                    defaultMessage="No matching builders, templates, or Classic rule types"
                  />
                </EuiText>
              )}
              <EuiHorizontalRule margin="xs" />
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                data-test-subj="mixedRulesEnterAiMode"
              >
                <EuiFlexItem>
                  <EuiText size="s" color="subdued">
                    <FormattedMessage
                      id="xpack.observabilityAlerting.mixedCreate.helpMeCreateRule"
                      defaultMessage="Build this rule with the agent"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <AiButton
                    variant="empty"
                    size="s"
                    iconType="productAgent"
                    onClick={() => onSubmitToAgent(measureText)}
                    data-test-subj="mixedRulesEnterAiModeButton"
                    disabled={!hasSearchQuery}
                  >
                    <FormattedMessage
                      id="xpack.observabilityAlerting.mixedCreate.sendToAgent"
                      defaultMessage="Send to Agent"
                    />
                  </AiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiSelectable>
      </EuiInputPopover>
      <EuiSpacer size="m" />

      {/*
        Universal starters — presentation is prototype-toggleable (panel default / badge).
        Body stays fixed while searching; typeahead owns filtered results.
      */}
      <IdleBuilderStarters
        presentation={idleBuilderPresentation}
        onChooseThreshold={onChooseThreshold}
        onChooseSequence={onChooseSequence}
        onChooseEsql={onChooseEsql}
      />

      {suggestedTemplates.length > 0 ? (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.fromTheLibrarySection"
                  defaultMessage="Start from a template"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={onExploreLibrary} data-test-subj="mixedRulesExploreLibrary">
                <FormattedMessage
                  id="xpack.observabilityAlerting.mixedCreate.exploreLibrary"
                  defaultMessage="Explore library"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            gutterSize="m"
            direction={isMaximized ? 'row' : 'column'}
            responsive={false}
            data-test-subj="mixedRulesSuggestedTemplates"
            data-maximized={isMaximized ? 'true' : 'false'}
          >
            {suggestedTemplates.map((template) => (
              <EuiFlexItem
                key={template.id}
                grow={isMaximized ? 1 : false}
                css={
                  isMaximized
                    ? css`
                        flex-basis: 0;
                        min-width: 0;
                        & > * {
                          height: 100%;
                        }
                      `
                    : undefined
                }
              >
                <RuleLibraryCard
                  iconType={template.iconType}
                  title={template.title}
                  description={template.description}
                  tags={template.tags}
                  builderType={template.createPath}
                  compact={!isMaximized}
                  onClick={() => onSelectDemoTemplate(template)}
                  data-test-subj={`mixedRulesSuggestedTemplate-${template.id}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </>
      ) : null}

      {showClassic && showClassicIdleFooter ? (
        <>
          <EuiSpacer size="m" />
          <EuiPanel
            color="subdued"
            hasBorder={false}
            hasShadow={false}
            paddingSize="m"
            data-test-subj="mixedRulesClassicFooter"
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.lookingForClassic"
                    defaultMessage="Looking for Classic rule types?"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={() => onBrowseClassic(classicBrowseSearch)}
                  data-test-subj="mixedRulesBrowseClassic"
                >
                  <FormattedMessage
                    id="xpack.observabilityAlerting.mixedCreate.exploreRuleTypesList"
                    defaultMessage="Browse all"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      ) : null}
    </div>
  );
};
