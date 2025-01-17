import { ContentReferences } from "@kbn/elastic-assistant-common"
import { contentReferenceComponentFactory } from "./content_reference_component_factory"
import React from "react"
import { render, screen } from "@testing-library/react"
import { ContentReferenceNode } from "../content_reference_parser"

describe('contentReferenceComponentFactory', () => {
    it.each([
        ['EsqlQueryReference', {
            "1": {
                id: "1",
                type: "EsqlQuery",
                query: "",
                label: ""
            }
        } as ContentReferences, { contentReferenceId: "1" } as ContentReferenceNode],
        ['KnowledgeBaseEntryReference', {
            "1": {
                id: "1",
                type: "KnowledgeBaseEntry",
                knowledgeBaseEntryId: "",
                knowledgeBaseEntryName: ""
            }
        } as ContentReferences, { contentReferenceId: "1" } as ContentReferenceNode],
        ['ProductDocumentationReference', {
            "1": {
                id: "1",
                type: "ProductDocumentation",
                title: "",
                url: ""
            }
        } as ContentReferences, { contentReferenceId: "1" } as ContentReferenceNode],
        ['SecurityAlertReference', {
            "1": {
                id: "1",
                type: "SecurityAlert",
                alertId: "",
            }
        } as ContentReferences, { contentReferenceId: "1" } as ContentReferenceNode],
        ['SecurityAlertsPageReference', {
            "1": {
                id: "1",
                type: "SecurityAlertsPage",
            }
        } as ContentReferences, { contentReferenceId: "1" } as ContentReferenceNode],
    ])("Renders component: '%s'", async (testId: string, contentReferences: ContentReferences, contentReferenceNode: ContentReferenceNode) => {

        const Component = contentReferenceComponentFactory({ contentReferences, contentReferencesVisible: true })

        render(<Component {...contentReferenceNode} />)

        expect(screen.getByTestId(testId)).toBeInTheDocument();
    })

    it("renders nothing when content reference is not found", async () => {

        const Component = contentReferenceComponentFactory({
            contentReferences: {
            }, contentReferencesVisible: true
        })

        const { container } = render(<Component {...{ contentReferenceId: "1", contentReferenceCount: 1 } as ContentReferenceNode} />)

        expect(container).toBeEmptyDOMElement()
        expect(screen.queryByText("[1]")).not.toBeInTheDocument();
    })

    it("renders placeholder if contentReferences do not exist", async () => {

        const Component = contentReferenceComponentFactory({
            contentReferences: undefined, contentReferencesVisible: true
        })

        render(<Component {...{ contentReferenceId: "1", contentReferenceCount: 1 } as ContentReferenceNode} />)

        expect(screen.getByTestId("ContentReferenceButton")).toBeInTheDocument();
        expect(screen.getByText("[1]")).toBeInTheDocument();

    })
})