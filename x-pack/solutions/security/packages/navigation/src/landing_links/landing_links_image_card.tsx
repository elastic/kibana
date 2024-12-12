/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { withLink } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

export interface LandingLinksImageCardProps {
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const CARD_HEIGHT = 116;
const CARD_WIDTH = 370;
const CARD_HEIGHT_IMAGE = 98;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    card: css`
      height: ${CARD_HEIGHT}px;
      max-width: ${CARD_WIDTH}px;
    `,
    cardWrapper: css`
      height: 100%;
    `,
    titleContainer: css`
      height: ${euiTheme.size.l};
    `,
    title: css`
      color: ${euiTheme.colors.primaryText};
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    getImageContainer: (imageUrl: string | undefined) => css`
      height: ${CARD_HEIGHT_IMAGE}px;
      width: ${CARD_HEIGHT_IMAGE}px;
      background-position: center center;
      background-repeat: no-repeat;
      background-image: url(${imageUrl ?? ''});
      background-size: auto 98px;
    `,
  };
};

const EuiPanelWithLink = withLink(EuiPanel);

export const LandingLinksImageCard: React.FC<LandingLinksImageCardProps> = React.memo(
  function LandingLinksImageCard({ item, urlState, onLinkClick }) {
    const styles = useStyles();

    const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
    const { landingImage, title, description, isBeta, betaOptions } = item;

    const imageBackground = useMemo(
      () => styles.getImageContainer(landingImage),
      [landingImage, styles]
    );

    return (
      <EuiFlexItem data-test-subj="LandingImageCard-item" grow={false}>
        <EuiPanelWithLink {...linkProps} hasBorder paddingSize="s" css={styles.card}>
          <EuiFlexGroup
            gutterSize="s"
            direction="row"
            justifyContent="flexStart"
            alignItems="flexStart"
            css={styles.cardWrapper}
          >
            <EuiFlexItem grow={false}>
              {landingImage && (
                <EuiPanel
                  data-test-subj="LandingImageCard-image"
                  paddingSize="none"
                  hasShadow={false}
                  hasBorder
                  borderRadius="m"
                  css={imageBackground}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" direction="column">
                <EuiFlexItem>
                  <EuiFlexGroup
                    gutterSize="none"
                    direction="row"
                    css={styles.titleContainer}
                    alignItems="center"
                  >
                    <EuiFlexItem component="span" grow={false}>
                      <EuiTitle size="xxxs" css={styles.title}>
                        <h3>{title}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>{isBeta && <BetaBadge text={betaOptions?.text} />}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">{description}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanelWithLink>
      </EuiFlexItem>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksImageCard;
