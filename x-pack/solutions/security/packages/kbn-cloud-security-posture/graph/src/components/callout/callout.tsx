/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GRAPH_CALLOUT_TEST_ID, GRAPH_CALLOUT_LINK_TEST_ID } from '../test_ids';

const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.callout';

export type CalloutVariant =
  | 'missingAllRequirements'
  | 'uninstalledIntegration'
  | 'disabledEntityStore'
  | 'unavailableEntityInfo'
  | 'unknownEntityType';

export interface CalloutProps {
  /**
   * The variant of the callout to display
   */
  variant: CalloutVariant;
  /**
   * Optional callback when the dismiss button is clicked
   */
  onDismiss?: () => void;
}

// Reusable i18n constants
const ENRICH_GRAPH_EXPERIENCE_TITLE = i18n.translate(`${i18nNamespaceKey}.enrichGraphExperience`, {
  defaultMessage: 'Enrich graph experience',
});

const INSTALL_CLOUD_ASSET_DISCOVERY_LINK = {
  text: i18n.translate(`${i18nNamespaceKey}.installCloudAssetDiscovery`, {
    defaultMessage: 'Install Cloud Asset Discovery',
  }),
  href: '#',
};

const ENABLE_ENTITY_STORE_LINK = {
  text: i18n.translate(`${i18nNamespaceKey}.enableEntityStore`, {
    defaultMessage: 'Enable Entity Store',
  }),
  href: '#',
};

const CALLOUT_CONFIG: Record<
  CalloutVariant,
  {
    title: string;
    message: string;
    links: Array<{ text: string; href: string }>;
  }
> = {
  missingAllRequirements: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.missingAllRequirements.message`, {
      defaultMessage:
        'Installing the Cloud Asset Discovery integration and enabling Entity Store for a high fidelity graph investigation experience.',
    }),
    links: [INSTALL_CLOUD_ASSET_DISCOVERY_LINK, ENABLE_ENTITY_STORE_LINK],
  },
  uninstalledIntegration: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.uninstalledIntegration.message`, {
      defaultMessage:
        'Installing the Cloud Asset Discovery integration for a high fidelity graph investigation experience.',
    }),
    links: [INSTALL_CLOUD_ASSET_DISCOVERY_LINK],
  },
  disabledEntityStore: {
    title: ENRICH_GRAPH_EXPERIENCE_TITLE,
    message: i18n.translate(`${i18nNamespaceKey}.disabledEntityStore.message`, {
      defaultMessage: 'Enable Entity Store for a high fidelity graph investigation experience.',
    }),
    links: [ENABLE_ENTITY_STORE_LINK],
  },
  unavailableEntityInfo: {
    title: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.title`, {
      defaultMessage: 'Entity information unavailable',
    }),
    message: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.message`, {
      defaultMessage: 'Entity information could not be retrieved.',
    }),
    links: [
      {
        text: i18n.translate(`${i18nNamespaceKey}.unavailableEntityInfo.linkText`, {
          defaultMessage: 'Verify Cloud Asset Discovery Data',
        }),
        href: '#',
      },
    ],
  },
  unknownEntityType: {
    title: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.title`, {
      defaultMessage: 'Unknown entity type',
    }),
    message: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.message`, {
      defaultMessage: 'Verify entity fields to improve graph accuracy.',
    }),
    links: [
      {
        text: i18n.translate(`${i18nNamespaceKey}.unknownEntityType.linkText`, {
          defaultMessage: 'Verify Cloud Asset Discovery',
        }),
        href: '#',
      },
    ],
  },
};

export const Callout = memo<CalloutProps>(({ variant, onDismiss }) => {
  const { euiTheme } = useEuiTheme();
  const config = CALLOUT_CONFIG[variant];
  const hasMultipleLinks = config.links.length > 1;

  return (
    <EuiCallOut
      title={config.title}
      color="primary"
      iconType="info"
      onDismiss={onDismiss}
      data-test-subj={GRAPH_CALLOUT_TEST_ID}
      size="s"
      css={css`
        width: 400px;
      `}
    >
      <EuiText
        size="xs"
        css={css`
          margin-bottom: ${hasMultipleLinks ? euiTheme.size.xs : '20px'};
        `}
      >
        {config.message}
      </EuiText>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        {config.links.map((link) => (
          <EuiLink
            key={link.href}
            href={link.href}
            target="_blank"
            external
            data-test-subj={GRAPH_CALLOUT_LINK_TEST_ID}
          >
            {link.text}
          </EuiLink>
        ))}
      </div>
    </EuiCallOut>
  );
});

Callout.displayName = 'Callout';
