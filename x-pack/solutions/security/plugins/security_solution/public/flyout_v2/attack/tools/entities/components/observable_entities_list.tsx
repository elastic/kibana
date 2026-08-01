/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackObservableEntity } from '../hooks/use_persisted_attack_entities';
import {
  ATTACK_ENTITIES_TOOL_OBSERVABLES_TEST_ID,
  ATTACK_ENTITIES_TOOL_OBSERVABLE_ROW_TEST_ID,
} from '../test_ids';

const IP_TYPE_KEYS: readonly string[] = ['observable-type-ipv4', 'observable-type-ipv6'];

const OBSERVABLE_TYPE_LABELS: Record<string, string> = {
  'observable-type-ipv4': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeIpv4',
    { defaultMessage: 'IPv4' }
  ),
  'observable-type-ipv6': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeIpv6',
    { defaultMessage: 'IPv6' }
  ),
  'observable-type-hostname': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeHostname',
    { defaultMessage: 'Host name' }
  ),
  'observable-type-domain': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeDomain',
    { defaultMessage: 'Domain' }
  ),
  'observable-type-file-hash': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeFileHash',
    { defaultMessage: 'File hash' }
  ),
  'observable-type-file-path': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeFilePath',
    { defaultMessage: 'File path' }
  ),
  'observable-type-agent-id': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeAgentId',
    { defaultMessage: 'Agent id' }
  ),
  'observable-type-email': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeEmail',
    { defaultMessage: 'Email' }
  ),
  'observable-type-url': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeUrl',
    { defaultMessage: 'URL' }
  ),
  'observable-type-user-name': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeUserName',
    { defaultMessage: 'User name' }
  ),
  'observable-type-service-name': i18n.translate(
    'xpack.securitySolution.flyoutV2.attack.tools.entities.observableTypeServiceName',
    { defaultMessage: 'Service name' }
  ),
};

export interface ObservableEntitiesListProps {
  /** Unmatched observables persisted on the attack document. */
  observableEntities: AttackObservableEntity[];
  /**
   * Renderer for IPv4/IPv6 values, so they open the network flyout via the new flyout system
   * (same pattern as the entity rows' host.ip links). Non-IP values render as plain text.
   */
  renderIpLink?: (ip: string) => React.ReactNode;
}

/**
 * Titled section of the attack Entities tool listing observable values extracted from the
 * attack's alerts that did not match any Entity Store entity.
 */
export const ObservableEntitiesList = memo(
  ({ observableEntities, renderIpLink }: ObservableEntitiesListProps) => {
    if (observableEntities.length === 0) {
      return null;
    }

    return (
      <EuiFlexItem data-test-subj={ATTACK_ENTITIES_TOOL_OBSERVABLES_TEST_ID}>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyoutV2.attack.tools.entities.observablesSectionTitle"
              defaultMessage="{observableCount, plural, one {Observable} other {Observables}}:"
              values={{ observableCount: observableEntities.length }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {observableEntities.map(({ typeKey, value }, index) => {
          const isIp = IP_TYPE_KEYS.includes(typeKey);
          return (
            <React.Fragment key={`observable-${index}-${typeKey}-${value}`}>
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                data-test-subj={ATTACK_ENTITIES_TOOL_OBSERVABLE_ROW_TEST_ID}
              >
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{OBSERVABLE_TYPE_LABELS[typeKey] ?? typeKey}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    {isIp && renderIpLink != null ? renderIpLink(value) : value}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </React.Fragment>
          );
        })}
      </EuiFlexItem>
    );
  }
);

ObservableEntitiesList.displayName = 'ObservableEntitiesList';
