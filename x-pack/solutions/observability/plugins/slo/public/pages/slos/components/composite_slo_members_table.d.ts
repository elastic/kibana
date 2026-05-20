import type { CompositeSLOMemberSummary } from '@kbn/slo-schema';
import React from 'react';
export declare function CompositeSloMembersTable({ members, percentFormat, }: {
    members: CompositeSLOMemberSummary[];
    percentFormat: string;
}): React.JSX.Element;
