import React from 'react';
export interface Frame {
    fileID: string;
    frameType: number;
    exeFileName: string;
    addressOrLine: number;
    functionName: string;
    sourceFileName: string;
    sourceLine: number;
    countInclusive: number;
    countExclusive: number;
    selfAnnualCO2Kgs: number;
    totalAnnualCO2Kgs: number;
    selfAnnualCostUSD: number;
    totalAnnualCostUSD: number;
    subGroups?: Record<string, number>;
}
export interface Props {
    comparisonFrame?: Frame;
    comparisonTotalSeconds?: number;
    comparisonTotalSamples?: number;
    comparisonRank?: number;
    frame?: Frame;
    totalSamples: number;
    totalSeconds: number;
    rank?: number;
    showSymbolsStatus?: boolean;
    compressed?: boolean;
}
export declare function FrameInformationWindow({ frame, showSymbolsStatus, comparisonFrame, comparisonRank, comparisonTotalSamples, comparisonTotalSeconds, totalSamples, totalSeconds, rank, compressed, }: Props): React.JSX.Element;
