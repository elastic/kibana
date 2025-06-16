import { useEffect, useState } from "react";
import { useKibana } from "../../common/lib/kibana";
import React from "react";
import { v4 as uuidv4 } from 'uuid';
import { createHtmlPortalNode, OutPortal, InPortal, HtmlPortalNode } from 'react-reverse-portal';
import { CommentActions } from ".";
import ReactDOM from 'react-dom';
import { CommentServiceActions } from "@kbn/elastic-assistant-shared-state";

interface PortalInfo {
    args: Parameters<CommentServiceActions['mount']>[0];
    portalNode: HtmlPortalNode;
}

/**
 * This component renders comment actions in a portal. The OutPortal is mounted by elastic_assistant/public/src/components/comment_actions/comment_actions_mounter.tsx
 * in the AI Assistant. This ensures that actions are rendered within the correct app context, allowing them to access the necessary services and state.
 */

export const CommentActionsPortal = () => {
    const { elasticAssistantSharedState } = useKibana().services;
    const [portals, setPortals] = useState<Record<string, PortalInfo>>({})

    useEffect(() => {
        const unmountActions = elasticAssistantSharedState.comments.registerActions({
            mount: (args) => (target) => {
                // Create a portal node for this message
                const portalNode = createHtmlPortalNode();
                const portalId = uuidv4();

                setPortals((prevPortals) => ({
                    ...prevPortals,
                    [portalId]: { args, portalNode }
                }));

                // Render the OutPortal in the target
                ReactDOM.render(<OutPortal node={portalNode} />, target);

                // Return cleanup function
                return () => {
                    portalNode.unmount();
                    ReactDOM.unmountComponentAtNode(target);
                    setPortals((prevPortals) => {
                        const newPortals = { ...prevPortals };
                        delete newPortals[portalId];
                        return newPortals;
                    });
                };
            }
        });

        return () => {
            unmountActions();
        };
    }, [elasticAssistantSharedState.comments]);


    return (
        <React.Fragment>
            {
                Object.entries(portals).map(([portalId, { args, portalNode }]) => (
                    <InPortal key={portalId} node={portalNode}>
                        <CommentActions message={args.message} />
                    </InPortal>
                ))
            }
        </React.Fragment>
    );
}