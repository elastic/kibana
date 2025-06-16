import { augmentMessageCodeBlocks } from "../helpers"
import { useState, useEffect, useRef } from "react";
import { InPortal, OutPortal, createHtmlPortalNode, HtmlPortalNode } from "react-reverse-portal";
import React from "react";

export const useAugmentMessageCodeBlocks = () => {
    const [inPortals, setPortals] = useState<React.JSX.Element[]>([]);
    // Track portal nodes for cleanup
    const portalNodesRef = useRef<HtmlPortalNode[]>([]);

    // Cleanup function to unmount all portal nodes when the component unmounts
    useEffect(() => {
        return () => {
            portalNodesRef.current.forEach(node => {
                node.unmount();
            });
        };
    }, []);

    const augmentMessageCodeBlocksFunc = (...args: Parameters<typeof augmentMessageCodeBlocks>) => {
        const result = augmentMessageCodeBlocks(...args)

        return result.map((codeBlockDetailsArr) => {
            return codeBlockDetailsArr.map(codeBlockDetails => {
                const portalNode = createHtmlPortalNode();
                // Store the portal node for cleanup
                portalNodesRef.current.push(portalNode);
                
                const inPortal = (
                    <InPortal node={portalNode}>
                        {codeBlockDetails.button}
                    </InPortal>
                )
                const outPortal = <OutPortal node={portalNode} />

                setPortals((prevPortals) => [...prevPortals, inPortal]);

                return { ...codeBlockDetails, button: outPortal };
            })
        })
    }

    return {
        augmentMessageCodeBlocksFunc,
        inPortals: inPortals,
    };
}