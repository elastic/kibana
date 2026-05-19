import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui/src/components/badge/badge';
export interface TagsListProps {
    onClick?: (tag: string) => void;
    tags?: string[];
    numberOfTagsToDisplay?: number;
    color?: EuiBadgeProps['color'];
    ignoreEmpty?: boolean;
    disableExpand?: boolean;
    prependChildren?: React.ReactNode;
}
declare const TagsList: ({ ignoreEmpty, tags, numberOfTagsToDisplay, onClick, color, disableExpand, prependChildren, }: TagsListProps) => React.JSX.Element | null;
export default TagsList;
