/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from 'unist';
import type { Parent } from 'mdast';
import { CustomCitationNodeDetails } from './custom_citation_parser';

export const customCitationLanguagePlugin = () => {
    let customCitationCount = 1
    const visitor = (node: Node) => {
        console.log(node)
        if(isCustomCitationNode(node)){
            //node.citationIndex = customCitationCount ++
        }

        if (isParent(node)) {
            node.children.forEach((child) => {
                //visitor(child);
            });
        }
    };

    return (tree: Node) => {
        visitor(tree);
    };
};
/* 
export const customCitationLanguagePluginV1 = () => {
    let customCitationCount = 0
    const visitor = (node: Node) => {
        if (node.type === 'link' && 'children' in node) {
            const nodeAsParent = node as Parent;
            if (nodeAsParent.children.length === 1) {
                const textNode = nodeAsParent.children[0]
                if (textNode.type === 'text' && /^\[[0-9]+(:\S.*)?\]$/.test(textNode.value)) {
                    const textNodeValue = textNode.value
                    const textNodeParts = textNodeValue.substring(1, textNodeValue.length - 1).split(":")
                    node.type = "customCitation"
                    node.citationNumber = customCitationCount++
                    node.citationLable = textNodeParts.at(1)
                    return
                }
            }
        }

        if ('children' in node) {
            const nodeAsParent = node as Parent;
            nodeAsParent.children.forEach((child) => {
                visitor(child);
            });
        }
    };

    return (tree: Node) => {
        visitor(tree);
    };
};

export const cdustomCitationLanguagePlugin = () => {
    const visitContent = (content: Content): Content => {
        content.children
        return content
    }

    const visitNode = (node: Node) => {
        if (isParent(node)) {
            node.children = node.children.map(visitContent);
            return node
        } else {
            return node
        }
    };

    return (tree: Node) => {
        visitNode(tree);
    };
};
 */

function isParent(node: Node): node is Parent {
    return 'children' in node
}

function isCustomCitationNode(node: Node): node is CustomCitationNodeDetails {
    return node.type === 'customCitation'
}