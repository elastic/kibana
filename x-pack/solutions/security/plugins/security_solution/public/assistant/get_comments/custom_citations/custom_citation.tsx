/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiLoadingSpinner, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { CustomCitationNode } from './custom_citation_parser';

type CustomCitationProps = Pick<CustomCitationNode, "citationLable" | 'citationLink' | 'citationNumber' | 'incomplete'>

export const CustomCitation: React.FC<CustomCitationProps> = React.memo(({
    citationLable,
    citationLink,
    citationNumber,
    incomplete,
}) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const togglePopover = () => setIsPopoverOpen((prev) => !prev);
    const closePopover = () => setIsPopoverOpen(false);
    const openPopover = () => setIsPopoverOpen(true);

    if (incomplete) {
        return <EuiButtonEmpty
            size="xs"
            style={{
                padding: 0,
            }}
            contentProps={{
                style: {
                    alignItems: 'start',
                },
            }}
        >
            <sup>{`[...]`}</sup>
        </EuiButtonEmpty>
    }

    const button = (
        <EuiButtonEmpty
            onClick={togglePopover}
            onMouseEnter={openPopover}
            size="xs"
            style={{
                padding: 0,
            }}
            contentProps={{
                style: {
                    alignItems: 'start',
                },
            }}
        >
            <sup>{`[${citationNumber}]`}</sup>
        </EuiButtonEmpty>
    );

    return (
        <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            onMouseLeave={closePopover}
            anchorPosition="upCenter"
        >
            <EuiLink href={citationLink} target="_blank">
                {citationLable}
            </EuiLink>
        </EuiPopover>
    );
}, (prevProps, nextProps) => {
    return prevProps.incomplete === nextProps.incomplete;
});
