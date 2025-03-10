/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  useEuiTheme,
  useEuiFontSize,
  EuiAccordion,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  type IconType,
} from '@elastic/eui';
import type { NavigationLink, TitleLinkCategory, AccordionLinkCategory } from '../types';
import { LandingColumnLinks } from './landing_links';

export interface LandingLinksIconsCategoriesGroupsProps {
  links: Readonly<NavigationLink[]>;
  /** Only accordion category type supported */
  categories: Readonly<AccordionLinkCategory[]>;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const stackManagementButtonClassName = 'stackManagementSection__button';
const useStyle = () => {
  const { euiTheme } = useEuiTheme();
  const accordionFontSize = useEuiFontSize('xs');
  return {
    accordionButton: css`
  .${stackManagementButtonClassName} {
    font-weight: ${euiTheme.font.weight.bold};
    ${accordionFontSize}
  }}
`,
  };
};

export const LandingLinksIconsCategoriesGroups: React.FC<LandingLinksIconsCategoriesGroupsProps> =
  React.memo(function LandingLinksIconsCategoriesGroups({
    links,
    categories: accordionCategories,
    urlState,
    onLinkClick,
  }) {
    const style = useStyle();
    return (
      <>
        {accordionCategories.map(({ label, categories }, index) => (
          <EuiAccordion
            initialIsOpen
            key={`${label}_${index}`}
            id={`landingLinksCategoryGroups_${label}_${index}`}
            buttonContent={label}
            buttonClassName={stackManagementButtonClassName}
            css={style.accordionButton}
          >
            <EuiSpacer size="m" />
            <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
              {categories && (
                <LandingLinksIconsCategoryGroups
                  links={links}
                  categories={categories}
                  urlState={urlState}
                  onLinkClick={onLinkClick}
                />
              )}
              {/* This component can be extended to render LandingLinksIcons when `linkIds` is defined in the accordionCategory */}
            </EuiPanel>
          </EuiAccordion>
        ))}
      </>
    );
  });

interface LandingLinksIconsCategoryGroupsProps {
  links: Readonly<NavigationLink[]>;
  categories: Readonly<TitleLinkCategory[]>;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

type CategoriesLinks = Array<
  Pick<TitleLinkCategory, 'type' | 'label' | 'iconType'> & { links: NavigationLink[] }
>;

const useGroupStyles = () => {
  return {
    container: css`
      min-width: 22em;
    `,
  };
};
const LandingLinksIconsCategoryGroups: React.FC<LandingLinksIconsCategoryGroupsProps> = React.memo(
  function LandingLinksIconsCategoryGroups({ links, categories, urlState, onLinkClick }) {
    const styles = useGroupStyles();

    const categoriesLinks = useMemo(() => {
      const linksById = Object.fromEntries(links.map((link) => [link.id, link]));

      return categories.reduce<CategoriesLinks>((acc, { label, linkIds, type, iconType }) => {
        const linksItem = linkIds.reduce<NavigationLink[]>((linksAcc, linkId) => {
          if (linksById[linkId]) {
            linksAcc.push(linksById[linkId]);
          }
          return linksAcc;
        }, []);
        if (linksItem.length > 0) {
          acc.push({ type, label, iconType, links: linksItem });
        }
        return acc;
      }, []);
    }, [links, categories]);

    return (
      <EuiFlexGroup direction="row" gutterSize="xl" alignItems="flexStart" wrap>
        {categoriesLinks.map(({ label, links: categoryLinks, iconType }, index) => (
          <EuiFlexItem key={`${index}_${label}`} css={styles.container} grow={false}>
            <LandingColumnHeading label={label} iconType={iconType} />
            <LandingColumnLinks
              items={categoryLinks}
              urlState={urlState}
              onLinkClick={onLinkClick}
            />
            <EuiSpacer size="l" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);

const LandingColumnHeading: React.FC<{
  label?: string;
  iconType?: IconType;
}> = React.memo(function LandingColumnHeading({ label, iconType }) {
  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
      {iconType && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h2>{label}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

// eslint-disable-next-line import/no-default-export
export default LandingLinksIconsCategoriesGroups;
