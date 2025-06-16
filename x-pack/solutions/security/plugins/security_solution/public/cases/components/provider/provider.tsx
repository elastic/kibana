import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';

type Props = {
    children: React.ReactNode;
}
export const CaseProvider: React.FC<Props> = ({ children }) => {
    const { cases } = useKibana().services;
    const CasesContext = cases.ui.getCasesContext();
    const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);

    return (
        <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>{
            children
        }</CasesContext>
    );
}
