/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BAND_COLORS, PHASE_DEFINITIONS } from '../lib/phase_definitions';
import {
  MATURITY_COLORS,
  ROADMAP_MATURITY_LABELS,
  SECURITY_CAPABILITIES,
  SOC_FUNCTION_COLORS,
  SOC_FUNCTIONS,
} from '../lib/pipeline_vision_content';

export const PipelineVisionPanel = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiAccordion
      id="pipeline-vision-panel"
      initialIsOpen
      css={css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        margin-bottom: ${euiTheme.size.m};
        background: ${euiTheme.colors.emptyShade};
      `}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                width: 28px;
                height: 28px;
                border-radius: ${euiTheme.border.radius.medium};
                background: linear-gradient(135deg, #534ab7 0%, #0f766e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${euiTheme.colors.ghost};
              `}
            >
              <EuiIcon type="globe" size="s" />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.vision.title"
                  defaultMessage="FY27 Security vision — how we build"
                />
              </h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.sdlcIntel.pipeline.vision.subtitle"
                defaultMessage="Agentic Security Operations · Project Daybreak · 1 product · 4 capabilities · 8 phase gates"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <div
        css={css`
          padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
        `}
      >
        <EuiPanel hasBorder paddingSize="m" color="subdued">
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="xpack.sdlcIntel.pipeline.vision.northStar.label"
                    defaultMessage="North star"
                  />
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.sdlcIntel.pipeline.vision.northStar.body"
                  defaultMessage="Agentic Security Operations is the evolution of SIEM — same mission, new machinery. {projectDaybreak} aligns PM, design, and engineering on one story across FY27: AI agents run the security lifecycle while humans approve the actions."
                  values={{
                    projectDaybreak: (
                      <strong>
                        <FormattedMessage
                          id="xpack.sdlcIntel.pipeline.vision.projectDaybreak"
                          defaultMessage="Project Daybreak"
                        />
                      </strong>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiText size="xs" color="subdued" css={css`margin: ${euiTheme.size.m} 0 ${euiTheme.size.s};`}>
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.vision.hierarchy.label"
            defaultMessage="1 product · 4 capabilities · 12 SOC functions"
          />
        </EuiText>

        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.sdlcIntel.pipeline.vision.product"
                defaultMessage="Elastic Security"
              />
            </EuiBadge>
          </EuiFlexItem>
          {SECURITY_CAPABILITIES.map((capability) => (
            <EuiFlexItem grow={false} key={capability.key}>
              <EuiBadge>{capability.label}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="s" responsive wrap css={css`margin-top: ${euiTheme.size.s};`}>
          {SOC_FUNCTIONS.map((socFunction) => (
            <EuiFlexItem key={socFunction.key} style={{ minWidth: 200, flex: '1 1 200px' }}>
              <EuiPanel
                hasBorder
                paddingSize="s"
                css={css`
                  border-top: 3px solid ${SOC_FUNCTION_COLORS[socFunction.key]};
                  height: 100%;
                `}
              >
                <EuiText size="xs">
                  <strong>{socFunction.label}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {socFunction.subtitle}
                </EuiText>
                <ul
                  css={css`
                    margin: ${euiTheme.size.xs} 0 0;
                    padding-left: ${euiTheme.size.m};
                  `}
                >
                  {socFunction.items.map((item) => (
                    <li key={item}>
                      <EuiText size="xs">{item}</EuiText>
                    </li>
                  ))}
                </ul>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiText size="xs" color="subdued" css={css`margin: ${euiTheme.size.m} 0 ${euiTheme.size.s};`}>
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.vision.phases.label"
            defaultMessage="How every epic moves through the pipeline"
          />
        </EuiText>

        <EuiFlexGroup gutterSize="s" responsive wrap>
          {(['planning', 'delivery', 'feedback'] as const).map((band) => {
            const phases = PHASE_DEFINITIONS.filter((definition) => definition.band === band);
            return (
              <EuiFlexItem key={band} style={{ minWidth: 220, flex: '1 1 220px' }}>
                <EuiPanel
                  hasBorder
                  paddingSize="s"
                  css={css`
                    border-top: 3px solid ${BAND_COLORS[band].border};
                    background: ${BAND_COLORS[band].background};
                    height: 100%;
                  `}
                >
                  <EuiText size="xs">
                    <strong>
                      {band === 'planning' ? (
                        <FormattedMessage
                          id="xpack.sdlcIntel.pipeline.vision.band.planning"
                          defaultMessage="Planning · P1–P3"
                        />
                      ) : band === 'delivery' ? (
                        <FormattedMessage
                          id="xpack.sdlcIntel.pipeline.vision.band.delivery"
                          defaultMessage="Delivery · P4–P5"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.sdlcIntel.pipeline.vision.band.feedback"
                          defaultMessage="Feedback · P6–P8"
                        />
                      )}
                    </strong>
                  </EuiText>
                  <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                    {phases.map((phase) => (
                      <EuiFlexItem key={phase.key}>
                        <EuiText size="xs">
                          <strong>{phase.label}</strong> — {phase.title}
                          <span css={css`color: ${euiTheme.colors.textSubdued};`}>
                            {' '}
                            ({phase.subtitle})
                          </span>
                        </EuiText>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>

        <EuiText size="xs" color="subdued" css={css`margin: ${euiTheme.size.m} 0 ${euiTheme.size.s};`}>
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.vision.maturity.label"
            defaultMessage="Roadmap maturity on GitHub epics"
          />
        </EuiText>

        <EuiFlexGroup gutterSize="s" responsive wrap>
          {ROADMAP_MATURITY_LABELS.map((maturity) => (
            <EuiFlexItem key={maturity.key} style={{ minWidth: 200, flex: '1 1 200px' }}>
              <EuiPanel
                hasBorder
                paddingSize="s"
                css={css`
                  border-left: 3px solid ${MATURITY_COLORS[maturity.key]};
                  height: 100%;
                `}
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>{maturity.label}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{maturity.timing}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {maturity.description}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiText size="xs" color="subdued" css={css`margin-top: ${euiTheme.size.m};`}>
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.vision.readingGuide"
            defaultMessage="The grid below tracks each epic through these gates. P4 (tickets) and P5 (PRs merged) are live from GitHub ingest; P1–P3 and P6–P8 show as upcoming until planning docs and release telemetry are connected."
          />
        </EuiText>
      </div>
    </EuiAccordion>
  );
};
