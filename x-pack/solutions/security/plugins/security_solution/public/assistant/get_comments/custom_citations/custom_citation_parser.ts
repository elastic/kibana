import { RemarkTokenizer } from '@elastic/eui';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

export interface CustomCitationNodeDetails extends Node {
    type: 'customCitation';
    citationLink: string;
    citationLable: string
    citationIndex?: number
}

const startSignal = '!{citation'

/**
 * Parses `!{citation[citationLabel](citationLink)` into customCitation node 
 */
export const CustomCitationParser: Plugin = function CustomCitationParser() {
    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;
    let citationIndex = 1
    const tokenizeCustomCitation: RemarkTokenizer = function tokenizeCustomCitation(
        eat,
        value,
        silent
    ) {
        if (value.startsWith(startSignal) === false) return false;
        
        const nextChar = value[startSignal.length];
        
        if (nextChar !== '[') return false;
        
        let index = startSignal.length;
        
        function readArg(open: string, close: string) {
            if (value[index] !== open) return ''
            index++;
            
            let body = '';
            let openBrackets = 0;
            
            for (; index < value.length; index++) {
                const char = value[index];
                if (char === close && openBrackets === 0) {
                    index++;
                    
                    return body;
                } else if (char === close) {
                    openBrackets--;
                } else if (char === open) {
                    openBrackets++;
                }
                
                body += char;
            }
            
            return '';
        }
        
        const citationLabel = readArg('[', ']');
        const citationLink = readArg('(', ')');
        

        const now = eat.now();

        if (!citationLabel) {
            this.file.info('No citation lable found', {
                line: now.line,
                column: now.column + startSignal.length + 1
            });
        }

        if (!citationLink) {
            this.file.info('No citation link found', {
                line: now.line,
                column: now.column + startSignal.length + 3 + citationLabel.length
            });
        }

        if (!citationLink || !citationLabel) return false;

        if (silent) {
            return true;
        }

        now.column += startSignal.length + 1;
        now.offset += startSignal.length + 1;

        return eat(`!{citation[${citationLabel}](${citationLink})}`)({
            type: 'customCitation',
            citationLink: citationLink,
            citationLable: citationLabel,
            citationIndex: citationIndex++
        } as CustomCitationNodeDetails);
    };

    tokenizeCustomCitation.notInLink = true;

    tokenizeCustomCitation.locator = (value, fromIndex) => {
        return value.indexOf('!{citation', fromIndex);
    };

    tokenizers.customCitation = tokenizeCustomCitation;
    methods.splice(methods.indexOf('text'), 0, 'customCitation');
};