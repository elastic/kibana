/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { PageLoader } from '../../common/components/page_loader';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { ThreatHuntingEntitiesTable } from '../components/threat_hunting_entities_table';
import { ThreatHuntingEntityRiskLevels } from '../components/threat_hunting_entity_risk_levels';
import { useQueryToggle } from '../../common/containers/query_toggle';

const THREAT_HUNTING_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.home.title',
  {
    defaultMessage: 'Entity Threat Hunting',
  }
);

const HYPOTHESES_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.title',
  {
    defaultMessage: 'AI-picked personalized hypotheses for threat hunting',
  }
);

const hypothesesGradientStyles = css`
  background: linear-gradient(90deg, #f0ebff 0%, #e0d6ff 100%);
  border: none;
  color: inherit;
`;

const hypothesesTitleStyles = css`
  background: linear-gradient(98deg, #731dcf 17%, #0b64dd 83%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
`;

const hypothesesContainerStyles = css`
  border-radius: 8px;
  background: linear-gradient(
    112deg,
    rgba(115, 29, 207, 0.08) 3.58%,
    rgba(11, 100, 221, 0.08) 98.48%
  );
`;

const gradientButtonStyles = css`
  border-radius: 4px;
  background: linear-gradient(98deg, #731dcf 17%, #0b64dd 83%);
  color: var(--euiColorGhost);
`;

const AIHypothesesSection = () => {
  const toggleId = 'threat-hunting-ai-hypotheses';
  const { toggleStatus, setToggleStatus } = useQueryToggle(toggleId);

  return (
    <EuiPanel
      paddingSize="l"
      hasShadow={false}
      color="plain"
      data-test-subj="threatHuntingHypothesesPanel"
      css={hypothesesContainerStyles}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.toggleAriaLabel',
              { defaultMessage: 'Toggle AI hypotheses' }
            )}
            color="text"
            iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
            onClick={() => setToggleStatus(!toggleStatus)}
            data-test-subj="aiHypothesesToggle"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" color="#731DCF" data-test-subj="aiHypothesesIcon" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2 css={hypothesesTitleStyles}>{HYPOTHESES_TITLE}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="list" size="s" data-test-subj="seeAllHypothesesButton">
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.seeAllButton',
                  {
                    defaultMessage: 'See all hypotheses',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                iconType="sparkle"
                css={gradientButtonStyles}
                data-test-subj="huntWithAiButton"
              >
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.huntWithAiButton',
                  {
                    defaultMessage: 'Hunt with AI Assistant',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {toggleStatus && (
        <>
          <EuiSpacer size="s" />
          <EuiHorizontalRule margin="s" />
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="l" direction="row" wrap>
            {[0, 1, 2].map((index) => (
              <EuiFlexItem key={index} grow={true}>
                <EuiPanel paddingSize="s" hasShadow={false} color="plain">
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.cardTitle',
                        {
                          defaultMessage: 'Hypothesis {index}',
                          values: { index: index + 1 },
                        }
                      )}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.threatHunting.home.hypotheses.cardBody',
                        {
                          defaultMessage:
                            'Summarised AI reasoning for potential entity threats and suggested next steps.',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiSpacer size="s" />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};

const SignalsSection = () => (
  <EuiPanel paddingSize="xs">
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem>
        <ThreatHuntingEntityRiskLevels />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasShadow={false} color="subdued">
          <EuiTitle size="xs">
            <h4>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.threatHunting.home.signals.heatmapTitle',
                {
                  defaultMessage: 'Anomaly explorer',
                }
              )}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.threatHunting.home.signals.heatmapPlaceholder',
                {
                  defaultMessage: 'Heat map visualisation placeholder.',
                }
              )}
            </p>
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const ThreatHuntingHomePage: React.FC = () => {
  const [skipEmptyPrompt, setSkipEmptyPrompt] = React.useState(false);
  const onSkip = React.useCallback(() => setSkipEmptyPrompt(true), []);
  const {
    indicesExist: oldIndicesExist,
    loading: oldIsSourcererLoading,
    sourcererDataView: oldSourcererDataViewSpec,
  } = useSourcererDataView();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView, status } = useDataView();
  const indicesExist = useMemo(
    () => (newDataViewPickerEnabled ? !!dataView?.matchedIndices?.length : oldIndicesExist),
    [dataView?.matchedIndices?.length, newDataViewPickerEnabled, oldIndicesExist]
  );

  const isSourcererLoading = useMemo(
    () => (newDataViewPickerEnabled ? status !== 'ready' : oldIsSourcererLoading),
    [newDataViewPickerEnabled, oldIsSourcererLoading, status]
  );

  const showEmptyPrompt = !indicesExist && !skipEmptyPrompt;

  if (newDataViewPickerEnabled && status === 'pristine') {
    return <PageLoader />;
  }

  return (
    <>
      {showEmptyPrompt ? (
        <EmptyPrompt onSkip={onSkip} />
      ) : (
        <>
          <FiltersGlobal>
            <SiemSearchBar
              id={InputsModelId.global}
              sourcererDataView={newDataViewPickerEnabled ? dataView : oldSourcererDataViewSpec}
            />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="threatHuntingHomePage">
            <HeaderPage title={THREAT_HUNTING_TITLE} />
            <EuiHorizontalRule margin="s" />
            <EuiSpacer size="s" />
            <AIHypothesesSection />

            <EuiSpacer size="l" />
            <SignalsSection />

            <EuiSpacer size="l" />
            <ThreatHuntingEntitiesTable />
          </SecuritySolutionPageWrapper>
        </>
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalyticsOverview} />
    </>
  );
};
