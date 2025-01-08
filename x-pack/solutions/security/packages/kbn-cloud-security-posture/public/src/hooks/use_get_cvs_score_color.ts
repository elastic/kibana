import {useEuiTheme} from '@elastic/eui';

import { getCvsScoreColor as getCvsScoreColorUtil } from '../..';

export const useGetCvsScoreColor = () => {
    const { euiTheme } = useEuiTheme();

    const getCvsScoreColor = (score: number) => {
        return getCvsScoreColorUtil(score, euiTheme);
    }

    return { getCvsScoreColor };
}