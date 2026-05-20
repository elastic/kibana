import React from 'react';
interface Props {
    label: string;
    localStorageId: string;
}
/**
 * Saves on local storage that this item should no longer be visible
 * @param localStorageId
 */
export declare function hideBadge(localStorageId: string): void;
export declare function NavNameWithBadge({ label, localStorageId }: Props): React.JSX.Element;
export {};
