export declare function getInformationRows({ fileID, frameType, exeFileName, addressOrLine, functionName, sourceFileName, sourceLine, }: {
    fileID: string;
    frameType: number;
    exeFileName: string;
    addressOrLine: number;
    functionName: string;
    sourceFileName: string;
    sourceLine: number;
}): {
    'data-test-subj': string;
    label: string;
    value: string;
}[];
