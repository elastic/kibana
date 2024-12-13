/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiHorizontalRule, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { NavigationLink, LinkCategories } from '../types';
import { LandingLinksIcons } from './landing_links_icons';
import { LinkCategoryType } from '../constants';

export interface LandingLinksIconsCategoriesProps {
  links: Readonly<NavigationLink[]>;
  /** Only `title` and `separator` category types supported */
  categories: Readonly<LinkCategories>;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

type CategoriesLinks = Array<{ type?: LinkCategoryType; label?: string; links: NavigationLink[] }>;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    horizontalRule: css`
      margin-top: ${euiTheme.size.m};
      margin-bottom: ${euiTheme.size.l};
    `,
  };
};

export const LandingLinksIconsCategories: React.FC<LandingLinksIconsCategoriesProps> = React.memo(
  function LandingLinksIconsCategories({ links, categories, urlState, onLinkClick }) {
    const categoriesLinks = useMemo(() => {
      const linksById = Object.fromEntries(links.map((link) => [link.id, link]));

      return categories.reduce<CategoriesLinks>((acc, { label, linkIds, type }) => {
        const linksItem = linkIds?.reduce<NavigationLink[]>((linksAcc, linkId) => {
          if (linksById[linkId]) {
            linksAcc.push(linksById[linkId]);
          }
          return linksAcc;
        }, []);
        if (linksItem?.length) {
          acc.push({ type, label, links: linksItem });
        }
        return acc;
      }, []);
    }, [links, categories]);

    return (
      <>
        {categoriesLinks.map(
          ({ type = LinkCategoryType.title, label, links: categoryLinks }, index) => (
            <div key={`${index}_${label}`}>
              <CategoryHeading type={type} label={label} index={index} />
              <LandingLinksIcons
                items={categoryLinks}
                urlState={urlState}
                onLinkClick={onLinkClick}
              />
              <EuiSpacer size="l" />
            </div>
          )
        )}
      </>
    );
  }
);

const CategoryHeading: React.FC<{ type?: LinkCategoryType; label?: string; index: number }> =
  React.memo(function CategoryHeading({ type, label, index }) {
    const styles = useStyles();
    return (
      <>
        {index > 0 && <EuiSpacer size="xl" />}
        {type === LinkCategoryType.title && (
          <>
            <EuiTitle size="xxxs">
              <h2>{label}</h2>
            </EuiTitle>
            <EuiHorizontalRule css={styles.horizontalRule} />
          </>
        )}
        {type === LinkCategoryType.separator && index > 0 && (
          <EuiHorizontalRule css={styles.horizontalRule} />
        )}
      </>
    );
  });

// eslint-disable-next-line import/no-default-export
export default LandingLinksIconsCategories;
