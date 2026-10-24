/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { RUM_ANALYST_AGENT_ID, RUM_ANALYST_SESSION_TAG } from '../../../../common/rum_agent';
import {
  investigationPrompt,
  type RumInvestigationId,
  type RumLlmScope,
} from '../../../../common/rum_llm';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import type { RumAiLocationState } from '../../../utils/rum_search';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';

const PRESETS: Array<{
  id: RumInvestigationId;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: 'slow_users',
    icon: 'clock',
    title: i18n.translate('xpack.ux.ai.presets.slowUsersTitle', {
      defaultMessage: 'Find slow users',
    }),
    description: i18n.translate('xpack.ux.ai.presets.slowUsersDescription', {
      defaultMessage: 'Longest sessions, who they are, and which pages they hit.',
    }),
  },
  {
    id: 'slow_pages',
    icon: 'map',
    title: i18n.translate('xpack.ux.ai.presets.slowPagesTitle', {
      defaultMessage: 'Where is the site slow?',
    }),
    description: i18n.translate('xpack.ux.ai.presets.slowPagesDescription', {
      defaultMessage: 'Poor LCP by page and country.',
    }),
  },
  {
    id: 'errors',
    icon: 'bug',
    title: i18n.translate('xpack.ux.ai.presets.errorsTitle', {
      defaultMessage: 'Who is hitting errors?',
    }),
    description: i18n.translate('xpack.ux.ai.presets.errorsDescription', {
      defaultMessage: 'Exception groups, users, and replayable sessions.',
    }),
  },
  {
    id: 'frustration',
    icon: 'faceSad',
    title: i18n.translate('xpack.ux.ai.presets.frustrationTitle', {
      defaultMessage: 'Frustration hotspots',
    }),
    description: i18n.translate('xpack.ux.ai.presets.frustrationDescription', {
      defaultMessage: 'Rage and dead clicks by page and user.',
    }),
  },
  {
    id: 'compare',
    icon: 'chartArea',
    title: i18n.translate('xpack.ux.ai.presets.compareTitle', {
      defaultMessage: 'Compare vs last period',
    }),
    description: i18n.translate('xpack.ux.ai.presets.compareDescription', {
      defaultMessage: 'Stakeholder brief of KPI and CWV regressions.',
    }),
  },
];

export function RumAiPanel() {
  const { agentBuilder, application } = useKibanaServices();
  const history = useHistory();
  const location = useLocation<RumAiLocationState>();
  const followUp =
    typeof location.state?.rumAiFollowUp === 'string' && location.state.rumAiFollowUp
      ? location.state.rumAiFollowUp
      : undefined;
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      location: country,
      pageUrl,
      user,
      kuery,
    },
  } = useLegacyUrlParams();

  const [access, setAccess] = useState<{
    ready: boolean;
    canChat: boolean;
    reason: 'unavailable' | 'license' | 'connector' | 'ok';
  }>({ ready: false, canChat: false, reason: 'unavailable' });
  const [prompt, setPrompt] = useState<string | undefined>(followUp);
  const [nonce, setNonce] = useState(followUp ? 1 : 0);

  const scope: RumLlmScope = useMemo(
    () => ({
      rangeFrom,
      rangeTo,
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      browser,
      os,
      location: country,
      pageUrl,
      user,
      kuery,
    }),
    [browser, country, kuery, os, pageUrl, rangeFrom, rangeTo, serviceName, user]
  );

  useEffect(() => {
    if (!followUp) {
      return;
    }
    history.replace({
      pathname: location.pathname,
      search: location.search,
    });
  }, [followUp, history, location.pathname, location.search]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const canShow = Boolean(
        agentBuilder &&
          (application.capabilities.agentBuilder as { show?: boolean } | undefined)?.show
      );
      if (!agentBuilder || !canShow) {
        if (!cancelled) {
          setAccess({ ready: true, canChat: false, reason: 'unavailable' });
        }
        return;
      }
      try {
        const result = await agentBuilder.getAgentBuilderAccess();
        if (cancelled) {
          return;
        }
        if (!result.hasRequiredLicense) {
          setAccess({ ready: true, canChat: false, reason: 'license' });
          return;
        }
        if (!result.hasLlmConnector) {
          setAccess({ ready: true, canChat: false, reason: 'connector' });
          return;
        }
        setAccess({ ready: true, canChat: true, reason: 'ok' });
      } catch {
        if (!cancelled) {
          setAccess({ ready: true, canChat: false, reason: 'unavailable' });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [agentBuilder, application.capabilities.agentBuilder]);

  const runPreset = (id: RumInvestigationId) => {
    setPrompt(investigationPrompt(id, scope));
    setNonce((value) => value + 1);
  };

  if (!access.ready) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!access.canChat) {
    const title =
      access.reason === 'license'
        ? i18n.translate('xpack.ux.ai.needsLicenseTitle', {
            defaultMessage: 'Enterprise license required',
          })
        : access.reason === 'connector'
        ? i18n.translate('xpack.ux.ai.needsConnectorTitle', {
            defaultMessage: 'Configure a GenAI connector',
          })
        : i18n.translate('xpack.ux.ai.unavailableTitle', {
            defaultMessage: 'AI Analyst is unavailable',
          });
    const body =
      access.reason === 'license'
        ? i18n.translate('xpack.ux.ai.needsLicenseDescription', {
            defaultMessage: 'The RUM Analyst agent needs an enterprise (or trial) license.',
          })
        : access.reason === 'connector'
        ? i18n.translate('xpack.ux.ai.needsConnectorDescription', {
            defaultMessage:
              'Set a default GenAI connector in GenAI Settings. Pre-configured connectors work here too.',
          })
        : i18n.translate('xpack.ux.ai.unavailableDescription', {
            defaultMessage:
              'Enable Agent Builder to run RUM investigations (slow users, errors, geo, reports) with the RUM Analyst agent.',
          });
    return (
      <EuiEmptyPrompt
        iconType="sparkles"
        title={<h2>{title}</h2>}
        body={<p>{body}</p>}
        actions={
          access.reason === 'connector'
            ? [
                <EuiButton
                  key="connectors"
                  data-test-subj="uxAiOpenConnectors"
                  fill
                  onClick={() =>
                    application.navigateToApp('management', {
                      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
                    })
                  }
                >
                  {i18n.translate('xpack.ux.ai.openConnectorsButtonLabel', {
                    defaultMessage: 'Open connectors',
                  })}
                </EuiButton>,
              ]
            : undefined
        }
      />
    );
  }

  const { EmbeddableConversation } = agentBuilder!;

  return (
    <div data-test-subj="uxAiPanel">
      <UxTourAnchor stepId="ai" display="block">
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.ux.ai.presetsTitle', {
              defaultMessage: 'Investigations',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.ai.presetsDescription', {
              defaultMessage:
                'Uses the current time range and filters. The RUM Analyst agent can also write reports and open follow-up questions.',
            })}
          </p>
        </EuiText>
      </UxTourAnchor>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {PRESETS.map((preset) => (
          <EuiFlexItem key={preset.id}>
            <EuiCard
              data-test-subj={`uxAiPreset-${preset.id}`}
              icon={<EuiIcon size="l" type={preset.icon} aria-hidden={true} />}
              title={preset.title}
              description={preset.description}
              onClick={() => runPreset(preset.id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer />
      {access.reason === 'ok' && (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType="info"
          title={i18n.translate('xpack.ux.ai.chatHintTitle', {
            defaultMessage: 'Ask anything about this range — or pick a preset above.',
          })}
        />
      )}
      <EuiSpacer size="s" />
      <div
        css={css`
          min-height: 560px;
          height: 70vh;
          display: flex;
          flex-direction: column;
        `}
        data-test-subj="uxAiConversation"
      >
        <React.Suspense fallback={<EuiLoadingSpinner size="xl" />}>
          <EmbeddableConversation
            key={nonce}
            agentId={RUM_ANALYST_AGENT_ID}
            sessionTag={RUM_ANALYST_SESSION_TAG}
            newConversation={nonce > 0}
            initialMessage={prompt}
            autoSendInitialMessage={Boolean(prompt)}
            greetingMessage={i18n.translate('xpack.ux.ai.greetingTitle', {
              defaultMessage: 'What should we investigate in this RUM range?',
            })}
          />
        </React.Suspense>
      </div>
    </div>
  );
}
