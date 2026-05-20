import React from 'react';
interface RulesTabProps {
    setRefresh: React.Dispatch<React.SetStateAction<Date>>;
    stateRefresh: Date;
}
export declare function RulesTab({ setRefresh, stateRefresh }: RulesTabProps): React.JSX.Element;
export {};
