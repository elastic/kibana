/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { AttackDiscoveryTab } from '../../../attack_discovery/pages/results/attack_discovery_panel/tabs/attack_discovery_tab';
import type { IAttackDiscoveryAttachmentProps } from './types';

const containerCss = css`
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
`;

const AttackDiscoveryContent = ({ externalReferenceMetadata }: IAttackDiscoveryAttachmentProps) => {
    const metadata = externalReferenceMetadata;
    const { assistantAvailability, http } = useAssistantContext();

    // When querying by specific ID, don't use time range filter - the attack discovery
    // may have been created outside the current global time range
    const { isLoading, data } = useFindAttackDiscoveries({
        ids: metadata?.attackDiscoveryAlertId ? [metadata.attackDiscoveryAlertId] : undefined,
        http,
        isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    });

    const attackDiscovery = useMemo(() => {
        if (!data?.data || data.data.length === 0) {
            return null;
        }
        return data.data[0];
    }, [data]);

    if (!metadata) {
        return (
            <EuiText size="s" color="subdued">
                Attack discovery information not available
            </EuiText>
        );
    }

    if (isLoading) {
        return <EuiLoadingSpinner size="m" />;
    }

    if (!attackDiscovery) {
        return (
            <EuiText size="s" color="subdued">
                Attack discovery not found
            </EuiText>
        );
    }

    return (
        <div css={containerCss}>
            <AttackDiscoveryTab attackDiscovery={attackDiscovery} />
        </div>
    );
};

// eslint-disable-next-line import/no-default-export
export { AttackDiscoveryContent as default };

