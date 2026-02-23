/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@kbn/security-solution-navigation/src/navigation';
import type { IAttackDiscoveryAttachmentProps } from './types';

const AttackDiscoveryEvent = ({
    externalReferenceMetadata,
    externalReferenceId,
}: IAttackDiscoveryAttachmentProps) => {
    const { getAppUrl, navigateTo } = useNavigation();

    const attackDiscoveryTitle = useMemo(() => {
        return externalReferenceMetadata?.title || `Attack Discovery ${externalReferenceId}`;
    }, [externalReferenceMetadata?.title, externalReferenceId]);

    // TODO: Add navigation to attack discovery details page when available
    const attackDiscoveryHref = useMemo(() => {
        // For now, link to the alert details page
        return getAppUrl({
            path: `/app/security/alerts/${externalReferenceId}`,
        });
    }, [getAppUrl, externalReferenceId]);

    const onLinkClick = useCallback(
        (ev: React.MouseEvent<HTMLAnchorElement>) => {
            ev.preventDefault();
            return navigateTo({ url: attackDiscoveryHref });
        },
        [navigateTo, attackDiscoveryHref]
    );

    return (
        <EuiText size="s">
            <span>Added attack discovery: </span>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink onClick={onLinkClick} href={attackDiscoveryHref} data-test-subj={`attack-discovery-link-${externalReferenceId}`}>
                {attackDiscoveryTitle}
            </EuiLink>
        </EuiText>
    );
};

// eslint-disable-next-line import/no-default-export
export { AttackDiscoveryEvent as default };




