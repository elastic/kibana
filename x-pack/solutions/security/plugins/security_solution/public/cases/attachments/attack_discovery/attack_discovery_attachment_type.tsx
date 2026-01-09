/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { getLazyAttackDiscoveryContent } from './lazy_attack_discovery_content';
import { getLazyAttackDiscoveryEvent } from './lazy_attack_discovery_event';
import type { IAttackDiscoveryAttachmentProps } from './types';

export const getAttackDiscoveryAttachmentType = (): ExternalReferenceAttachmentType => ({
    id: ATTACK_DISCOVERY_ATTACHMENT_TYPE,
    displayName: 'Attack Discovery',
    icon: 'bug',
    // @ts-expect-error: TS2322 figure out types for children lazyExotic
    getAttachmentViewObject: (props: IAttackDiscoveryAttachmentProps) => {
        return {
            event: getLazyAttackDiscoveryEvent(props),
            timelineAvatar: (
                <EuiAvatar
                    name="attack-discovery"
                    color="#BD271E"
                    iconType="bug"
                    aria-label="Attack Discovery"
                />
            ),
            children: getLazyAttackDiscoveryContent,
        };
    },
});

