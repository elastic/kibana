/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCard,
  EuiFieldSearch,
  EuiToolTip,
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
  euiFontSizeFromScale,
  euiLineHeightFromBaseline,
  keys,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ConversationInputShell,
  CONVERSATION_INPUT_SHELL_RADIUS,
} from '@kbn/agent-builder-browser';
import { AiButton } from '@kbn/ui-ai-components';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDebounceFn } from '@kbn/react-hooks';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useFindTemplatesQuery } from '@kbn/response-ops-rules-apis/hooks/use_find_templates_query';
import type { CoreStart } from '@kbn/core/public';
import type { IdleBuilderPresentation } from './mixed_create_prototype_settings';

const TITLE_ID = 'mixedCreateRuleFlyoutTitle';
const CLASSIC_TITLE_ID = 'mixedClassicRuleTypesFlyoutTitle';
const MEASURE_SUGGESTIONS_LIST_ID = 'mixedRulesMeasureSuggestionsList';
const SEARCH_DEBOUNCE = { wait: 300 };

const DISCOVER_QUERY_PILL_REMOVE_LABEL = i18n.translate(
  'xpack.observabilityAlerting.mixedCreate.discoverQueryPillRemove',
  { defaultMessage: 'Remove Discover query' }
);

/** Lightweight ES|QL attachment chip for the ask-anything shell (Agent Builder–style). */
const DiscoverEsqlQueryPill = ({
  query,
  onRemove,
}: {
  query: string;
  onRemove: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);
  const truncatedQuery =
    query.length > 72 ? `${query.slice(0, 69).trimEnd()}…` : query;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      css={css`
        max-width: 100%;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={query}
      data-test-subj="mixedRulesDiscoverQueryPill"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${euiTheme.size.xl};
              height: ${euiTheme.size.xl};
              border-radius: ${euiTheme.border.radius.small};
              background-color: ${euiTheme.colors.backgroundBasePrimary};
            `}
          >
            <EuiIcon type="code" size="m" color="primary" aria-hidden />
          </div>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.observabilityAlerting.mixedCreate.discoverQueryPillLabel"
                defaultMessage="ES|QL query"
              />
            </strong>
          </EuiText>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {truncatedQuery}
          </EuiText>
        </EuiFlexItem>
        {isHovered ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={DISCOVER_QUERY_PILL_REMOVE_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                color="text"
                aria-label={DISCOVER_QUERY_PILL_REMOVE_LABEL}
                onClick={onRemove}
                data-test-subj="mixedRulesDiscoverQueryPillRemove"
              />
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

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
  discoverQuery,
  compactAskAnything = false,
  idleBuilderPresentation = 'panel',
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
  /** Live ES|QL from Discover when create-rule was opened from Discover. */
  discoverQuery?: string;
  /** Prototype: compact idle field that grows with typed content. */
  compactAskAnything?: boolean;
  /** Prototype: how Threshold / Sequence starters render. */
  idleBuilderPresentation?: IdleBuilderPresentation;
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
        discoverQuery={discoverQuery}
        compactAskAnything={compactAskAnything}
        idleBuilderPresentation={idleBuilderPresentation}
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
  discoverQuery,
  compactAskAnything,
  idleBuilderPresentation,
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
  discoverQuery?: string;
  compactAskAnything: boolean;
  idleBuilderPresentation: IdleBuilderPresentation;
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
        <EuiTitle size="s" id={TITLE_ID}>
          <h2>
            <FormattedMessage
              id="xpack.observabilityAlerting.mixedCreate.title"
              defaultMessage="Create rule"
            />
          </h2>
        </EuiTitle>
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
          discoverQuery={discoverQuery}
          isMaximized={isMaximized}
          compactAskAnything={compactAskAnything}
          idleBuilderPresentation={idleBuilderPresentation}
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

/**
 * Prototype heuristic: descriptive natural language → offer Enter AI mode.
 * Suggest only — never auto-switch. Short keywords and ES|QL stay on search.
 */
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

const ASK_ANYTHING_COMPACT_MIN_ROWS = 1;
const ASK_ANYTHING_COMPACT_MAX_ROWS = 6;
const ASK_ANYTHING_GROW_TRANSITION = '180ms ease';

const agentChatInputStyles = ({ euiTheme }: UseEuiTheme, compactAskAnything: boolean) => {
  const lineHeight = euiLineHeightFromBaseline('s', euiTheme);
  return {
    textarea: css`
      cursor: text;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      box-sizing: border-box;
      width: 100%;
      font-size: ${euiFontSizeFromScale('s', euiTheme)};
      line-height: ${lineHeight};
      color: ${euiTheme.colors.textParagraph};
      font-family: inherit;
      ${compactAskAnything
        ? `
        /* flex:1 was locking height to the shell — grow from content instead. */
        flex: none;
        overflow-y: auto;
        min-height: calc(${lineHeight} * ${ASK_ANYTHING_COMPACT_MIN_ROWS});
        max-height: calc(${lineHeight} * ${ASK_ANYTHING_COMPACT_MAX_ROWS});
        transition: height ${ASK_ANYTHING_GROW_TRANSITION};
      `
        : `
        flex: 1;
      `}

      &::placeholder {
        color: ${euiTheme.colors.textDisabled};
      }

      :focus:focus-visible {
        outline-style: none;
      }
    `,
  };
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
  keywords: string[];
}> = [
  {
    id: 'threshold',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.thresholdTitle', {
      defaultMessage: 'Threshold',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.thresholdPathHint', {
      defaultMessage: 'Guided builder for counts and metric thresholds',
    }),
    keywords: ['threshold', 'count', 'metric', 'builder'],
  },
  {
    id: 'sequence',
    label: i18n.translate('xpack.observabilityAlerting.mixedCreate.sequenceTitle', {
      defaultMessage: 'Sequence',
    }),
    description: i18n.translate('xpack.observabilityAlerting.mixedCreate.sequencePathHint', {
      defaultMessage: 'Guided builder for multi-step patterns',
    }),
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
  discoverQuery?: string;
  isMaximized: boolean;
  compactAskAnything: boolean;
  idleBuilderPresentation: IdleBuilderPresentation;
};

/** Shared create-rule chooser body (flyout + rules-list empty state). */
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
  discoverQuery,
  isMaximized,
  compactAskAnything,
  idleBuilderPresentation,
}: MixedCreateChooserBodyProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const chatStyles = useMemo(
    () => agentChatInputStyles(euiThemeContext, compactAskAnything),
    [compactAskAnything, euiThemeContext]
  );
  const [measureText, setMeasureText] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const askAnythingTextareaRef = useRef<HTMLTextAreaElement>(null);
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

  const isDescriptiveNaturalLanguage = useMemo(
    () => looksLikeDescriptiveNaturalLanguage(measureText),
    [measureText]
  );

  // Offer AI mode when free text reads like a description — body below stays unchanged.
  const showAiModeOffer = isDescriptiveNaturalLanguage;

  const measureQuery = measureText.trim().toLowerCase();
  const hasSearchQuery = measureQuery.length > 0;
  const classicBrowseSearch = measureText.trim() || undefined;

  // Kept for future domain-aware template filtering; not used to reshape the idle body.
  const inferredDomain = useMemo(() => inferDataDomain(measureText), [measureText]);

  const suggestionOptions = useMemo<AskAnythingSuggestionOption[]>(() => {
    // AI mode owns the CTA — don't compete with typeahead options.
    if (!hasSearchQuery || showAiModeOffer) {
      return [];
    }

    // Promote Universal builders first; never hide templates or Classic matches.
    const matchingBuilders = CREATE_PATH_SUGGESTIONS.filter((path) => {
      return (
        path.label.toLowerCase().includes(measureQuery) ||
        path.description.toLowerCase().includes(measureQuery) ||
        path.keywords.some(
          (keyword) => keyword.includes(measureQuery) || measureQuery.includes(keyword)
        )
      );
    });

    // No builder hit → keep Universal useful with Write ES|QL as the fallback path.
    const universalPaths =
      matchingBuilders.length > 0
        ? matchingBuilders
        : CREATE_PATH_SUGGESTIONS.filter((path) => path.id === 'esql');

    const pathOptions: AskAnythingSuggestionOption[] = universalPaths.map((path) => ({
      label: path.label,
      key: `${PATH_SUGGESTION_KEY_PREFIX}${path.id}`,
      description: path.description,
      suggestionKind: 'path' as const,
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
        label: i18n.translate('xpack.observabilityAlerting.mixedCreate.templateGroupLabel', {
          defaultMessage: 'Start from a template',
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
        'data-test-subj': 'mixedRulesSuggestionGroup-classic',
      });
      options.push(...classicRuleOptions);
    }

    return options;
  }, [classicRuleTypes, hasSearchQuery, measureQuery, showAiModeOffer, showClassic]);

  const syncAskAnythingHeight = useCallback(() => {
    const textarea = askAnythingTextareaRef.current;
    if (!textarea) {
      return;
    }
    if (!compactAskAnything) {
      textarea.style.height = '';
      return;
    }
    const computed = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computed.lineHeight);
    const resolvedLineHeight =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? lineHeight
        : Number.parseFloat(euiLineHeightFromBaseline('s', euiTheme)) || 20;
    const minHeight = resolvedLineHeight * ASK_ANYTHING_COMPACT_MIN_ROWS;
    const maxHeight = resolvedLineHeight * ASK_ANYTHING_COMPACT_MAX_ROWS;
    // Reset so scrollHeight reflects content (including shrink).
    textarea.style.height = '0px';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
  }, [compactAskAnything, euiTheme]);

  const onMeasureTextChange = (value: string) => {
    setMeasureText(value);
  };

  // Keep height in sync when content, mode, or chrome (AI footer) changes.
  useLayoutEffect(() => {
    syncAskAnythingHeight();
  }, [measureText, showAiModeOffer, syncAskAnythingHeight]);

  // Escape closes the portaled suggestion panel; Enter submits to the agent via the textarea handler.
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

  const trimmedDiscoverQuery = discoverQuery?.trim();
  const [isDiscoverQueryAttached, setIsDiscoverQueryAttached] = useState(
    () => Boolean(trimmedDiscoverQuery)
  );

  // Keep the pill in sync when Discover's live query appears/changes; don't re-attach after dismiss.
  const dismissedDiscoverQueryRef = useRef(false);
  useEffect(() => {
    if (!trimmedDiscoverQuery) {
      setIsDiscoverQueryAttached(false);
      return;
    }
    if (!dismissedDiscoverQueryRef.current) {
      setIsDiscoverQueryAttached(true);
    }
  }, [trimmedDiscoverQuery]);

  const attachedDiscoverQuery =
    isDiscoverQueryAttached && trimmedDiscoverQuery ? trimmedDiscoverQuery : undefined;

  const onSubmitToAgent = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    closeSuggestions({ suppressFocusReopen: true });
    onChooseAgent(trimmed, attachedDiscoverQuery);
  };

  const onAgentInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      closeSuggestions({ suppressFocusReopen: true });
      return;
    }
    if (event.key === keys.ENTER && !event.shiftKey) {
      event.preventDefault();
      onSubmitToAgent(measureText);
    }
  };

  const hasSelectableSuggestions = suggestionOptions.some((option) => !option.isGroupLabel);
  // AI mode replaces the empty/noisy suggestion panel — don't show "No options available".
  const areSuggestionsVisible =
    isSuggestionsOpen && hasSearchQuery && !showAiModeOffer && hasSelectableSuggestions;

  const askAnythingWrapperCss = css`
    border-radius: ${CONVERSATION_INPUT_SHELL_RADIUS}px;
    ${showAiModeOffer
      ? `
      border: ${euiTheme.border.thin};
      border-color: ${euiTheme.colors.borderBaseSubdued};
      overflow: hidden;
    `
      : ''}
  `;

  const askAnythingShellCss = css`
    ${compactAskAnything
      ? `
      /* Tighter chrome so one-line idle reads as a search field, not a chat box. */
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      min-height: 0;
    `
      : ''}
    ${showAiModeOffer
      ? `
      border-color: transparent !important;
      box-shadow: none !important;
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      &:hover,
      &:focus-within[aria-disabled='false'] {
        border-color: transparent !important;
        box-shadow: none !important;
      }
    `
      : ''}
  `;

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
        panelPaddingSize="none"
        isOpen={areSuggestionsVisible}
        closePopover={closeSuggestions}
        input={
          <div css={askAnythingWrapperCss}>
            <ConversationInputShell
              data-test-subj="mixedRulesAgentChatInput"
              // Compact mode drops the Agent Builder 150px min-height so idle starts at one line.
              isCollapsed={compactAskAnything}
              suppressShadow={showAiModeOffer}
              css={askAnythingShellCss}
            >
              {attachedDiscoverQuery ? (
                <DiscoverEsqlQueryPill
                  query={attachedDiscoverQuery}
                  onRemove={() => {
                    dismissedDiscoverQueryRef.current = true;
                    setIsDiscoverQueryAttached(false);
                  }}
                />
              ) : null}
              <textarea
                ref={askAnythingTextareaRef}
                css={chatStyles.textarea}
                rows={compactAskAnything ? ASK_ANYTHING_COMPACT_MIN_ROWS : 3}
                value={measureText}
                autoFocus={true}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  onMeasureTextChange(nextValue);
                  // Resize before paint so growth tracks each keystroke.
                  if (compactAskAnything) {
                    syncAskAnythingHeight();
                  }
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
                  // Only open the list once the user has started searching.
                  if (measureText.trim()) {
                    openSuggestions();
                  }
                }}
                onKeyDown={onAgentInputKeyDown}
                placeholder={i18n.translate(
                  'xpack.observabilityAlerting.mixedCreate.askAnythingPlaceholder',
                  {
                    defaultMessage:
                      'Pick a suggestion, or describe what you want and send to the agent.',
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
                    defaultMessage: 'Ask anything about the rule you want to create',
                  }
                )}
                data-test-subj="mixedRulesMeasureSearch"
                data-compact={compactAskAnything ? 'true' : 'false'}
              />
            </ConversationInputShell>
            <div
              data-test-subj={showAiModeOffer ? 'mixedRulesEnterAiMode' : undefined}
              aria-hidden={!showAiModeOffer}
              css={css`
                display: grid;
                grid-template-rows: ${showAiModeOffer ? '1fr' : '0fr'};
                transition: grid-template-rows ${ASK_ANYTHING_GROW_TRANSITION};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                border-top: ${showAiModeOffer ? euiTheme.border.thin : '0'};
                border-top-color: ${euiTheme.colors.borderBaseSubdued};
                overflow: hidden;
              `}
            >
              <div
                css={css`
                  min-height: 0;
                  opacity: ${showAiModeOffer ? 1 : 0};
                  transition: opacity ${ASK_ANYTHING_GROW_TRANSITION};
                  padding: ${showAiModeOffer ? `${euiTheme.size.s} ${euiTheme.size.base}` : '0'};
                `}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem
                    css={css`
                      min-width: 0;
                    `}
                  >
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.observabilityAlerting.mixedCreate.aiModeDetectedHint"
                        defaultMessage="Send this description to the agent to create the rule."
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <AiButton
                      variant="empty"
                      size="s"
                      // Figma: AI Button empty + productAgent (left) + gradient label.
                      iconType="productAgent"
                      onClick={() => onSubmitToAgent(measureText)}
                      data-test-subj="mixedRulesEnterAiModeButton"
                      disabled={!showAiModeOffer}
                      tabIndex={showAiModeOffer ? 0 : -1}
                    >
                      <FormattedMessage
                        id="xpack.observabilityAlerting.mixedCreate.sendToAgent"
                        defaultMessage="Send to Agent"
                      />
                    </AiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </div>
          </div>
        }
      >
        <EuiSelectable<AskAnythingSuggestionOption>
          singleSelection
          isPreFiltered
          options={suggestionOptions}
          emptyMessage={<span />}
          noMatchesMessage={<span />}
          css={css`
            .euiSelectableList__groupLabel {
              color: ${euiTheme.colors.textSubdued};
              font-weight: ${euiTheme.font.weight.medium};
              font-size: ${euiFontSizeFromScale('xs', euiTheme)};
              line-height: ${euiLineHeightFromBaseline('xs', euiTheme)};
              min-height: 0;
              padding-block: ${euiTheme.size.xxs};
              padding-inline: ${euiTheme.size.m};
              &:not(:first-child) {
                padding-top: ${euiTheme.size.xs};
                &::before {
                  inset-block-start: ${euiTheme.size.xxs};
                }
              }
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
          renderOption={(option) =>
            option.isGroupLabel ? (
              option.label
            ) : (
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
            )
          }
          listProps={{
            // Option rows stay 48px; group headings are shorter than EUI's default
            // rowHeight+16 so section labels don't dominate the typeahead.
            rowHeight: 48,
            showIcons: true,
            id: MEASURE_SUGGESTIONS_LIST_ID,
            windowProps: {
              itemSize: (index: number) => {
                const option = suggestionOptions[index];
                if (option?.isGroupLabel) {
                  return index === 0 ? 28 : 36;
                }
                return 48;
              },
            },
          }}
          data-test-subj="mixedRulesMeasureSuggestions"
        >
          {(list) => list}
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
          <EuiSpacer size="m" />
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

      {showClassic ? (
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
