import type { LensOperation } from './helpers';
export interface AggMap {
    [key: string]: LensOperation;
}
interface PainlessTinyMathParserProps {
    equation: string;
    aggMap?: AggMap;
}
export declare class PainlessTinyMathParser {
    private IF;
    private ELSE;
    private AND;
    private OR;
    private NOT_EQUAL;
    private NOT;
    private openParenthesesRegex;
    private notRegex;
    private closeParenthesesRegex;
    private logicalConditionRegex;
    private aggMap;
    private equation;
    constructor({ equation, aggMap }: PainlessTinyMathParserProps);
    clean(expression: string): string;
    diveIntoString(expression: string, levelDownChar: string, levelUpChar: string): number | undefined;
    replaceCharactersWithAggMap(inputString: string, aggMap: AggMap): string;
    parseCondition(condition: string): string;
    getTrueBranch(expression: string): string;
    getFalseBrach(expression: string): string;
    getCondition(expression: string): string;
    parse(): string;
}
export {};
