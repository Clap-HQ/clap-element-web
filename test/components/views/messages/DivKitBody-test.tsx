/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render, waitFor } from "jest-matrix-react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import DivKitBody from "../../../../src/components/views/messages/DivKitBody";
import { mkEvent, stubClient } from "../../../test-utils";
import type { ClapAIContent, DivKitCard } from "../../../../src/utils/ClapAIDivKit";

const mockRender = jest.fn();
const mockCreateGlobalVariablesController = jest.fn();
const mockSetVariable = jest.fn();

jest.mock("@divkitframework/divkit/client", () => ({
    render: (...args: unknown[]) => mockRender(...args),
    createGlobalVariablesController: () => {
        const controller = {
            setVariable: mockSetVariable,
        };
        mockCreateGlobalVariablesController();
        return controller;
    },
    createVariable: jest.fn((name: string, type: string, value: unknown) => ({ name, type, value })),
}));

const mockUseTheme = jest.fn();
jest.mock("../../../../src/hooks/useTheme", () => ({
    useTheme: () => mockUseTheme(),
}));

describe("DivKitBody", () => {
    const roomId = "!room:example.com";
    const userId = "@user:example.com";

    const mockDivKitCard: DivKitCard = {
        log_id: "test-card",
        states: [
            {
                state_id: 0,
                div: {
                    type: "text",
                    text: "Hello World",
                },
            },
        ],
        variables: [{ name: "testVar", type: "string", value: "testValue" }],
    };

    const mockPalette = {
        light: [
            { name: "primary", color: "#000000" },
            { name: "secondary", color: "#ffffff" },
        ],
        dark: [
            { name: "primary", color: "#ffffff" },
            { name: "secondary", color: "#000000" },
        ],
    };

    const createMockEvent = (content: ClapAIContent): MatrixEvent => {
        return mkEvent({
            type: "m.room.message",
            room: roomId,
            user: userId,
            content: content as unknown as Record<string, unknown>,
            event: true,
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        stubClient();
        mockUseTheme.mockReturnValue({ theme: "light", systemThemeActivated: false });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should render DivKit card when present", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        const { container } = render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalled();
        });

        expect(container.querySelector(".mx_DivKitBody")).toBeInTheDocument();
    });

    it("should return null when card is missing", () => {
        const event = createMockEvent({
            msgtype: "m.text",
            body: "fallback text",
        });

        const { container } = render(<DivKitBody mxEvent={event} />);

        expect(container.firstChild).toBeNull();
        expect(mockRender).not.toHaveBeenCalled();
    });

    it("should return null when ac.clap.ai is missing", () => {
        const event = createMockEvent({
            msgtype: "m.text",
            body: "fallback text",
        });

        const { container } = render(<DivKitBody mxEvent={event} />);

        expect(container.firstChild).toBeNull();
    });

    it("should apply light palette variables for light theme", async () => {
        mockUseTheme.mockReturnValue({ theme: "light", systemThemeActivated: false });

        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
                palette: mockPalette,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockCreateGlobalVariablesController).toHaveBeenCalled();
        });

        expect(mockSetVariable).toHaveBeenCalledWith(expect.objectContaining({ name: "primary", value: "#000000" }));
        expect(mockSetVariable).toHaveBeenCalledWith(expect.objectContaining({ name: "secondary", value: "#ffffff" }));
    });

    it("should apply dark palette variables for dark theme", async () => {
        mockUseTheme.mockReturnValue({ theme: "dark", systemThemeActivated: false });

        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
                palette: mockPalette,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockCreateGlobalVariablesController).toHaveBeenCalled();
        });

        expect(mockSetVariable).toHaveBeenCalledWith(expect.objectContaining({ name: "primary", value: "#ffffff" }));
        expect(mockSetVariable).toHaveBeenCalledWith(expect.objectContaining({ name: "secondary", value: "#000000" }));
    });

    it("should apply card variables", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockSetVariable).toHaveBeenCalledWith(
                expect.objectContaining({ name: "testVar", value: "testValue" }),
            );
        });
    });

    it("should re-render on theme change", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
                palette: mockPalette,
            },
        });

        const { rerender } = render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalledTimes(1);
        });

        mockUseTheme.mockReturnValue({ theme: "dark", systemThemeActivated: false });

        rerender(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalledTimes(2);
        });
    });

    it("should call render with correct parameters", async () => {
        const eventId = "$test-event-id";
        const event = mkEvent({
            type: "m.room.message",
            room: roomId,
            user: userId,
            id: eventId,
            content: {
                "msgtype": "m.text",
                "body": "fallback text",
                "ac.clap.ai": {
                    card: mockDivKitCard,
                },
            } as unknown as Record<string, unknown>,
            event: true,
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: eventId,
                    json: expect.objectContaining({
                        card: mockDivKitCard,
                    }),
                }),
            );
        });
    });

    it("should cleanup on unmount", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        const { unmount, container } = render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalled();
        });

        const divKitContainer = container.querySelector(".mx_DivKitBody");
        expect(divKitContainer).toBeInTheDocument();

        unmount();
    });

    it("should handle missing palette gracefully", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalled();
        });

        expect(mockSetVariable).toHaveBeenCalledTimes(1);
    });

    it("should handle card without variables", async () => {
        const cardWithoutVars: DivKitCard = {
            log_id: "test-card",
            states: [{ state_id: 0, div: { type: "text", text: "Hello" } }],
        };

        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: cardWithoutVars,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalled();
        });

        expect(mockSetVariable).not.toHaveBeenCalled();
    });

    it("should pass onCustomAction handler to render", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalledWith(
                expect.objectContaining({
                    onCustomAction: expect.any(Function),
                }),
            );
        });
    });

    it("should pass onError handler to render", async () => {
        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockRender).toHaveBeenCalledWith(
                expect.objectContaining({
                    onError: expect.any(Function),
                }),
            );
        });
    });

    it("should detect dark theme from theme string containing 'dark'", async () => {
        mockUseTheme.mockReturnValue({ theme: "custom-dark-theme", systemThemeActivated: false });

        const event = createMockEvent({
            "msgtype": "m.text",
            "body": "fallback text",
            "ac.clap.ai": {
                card: mockDivKitCard,
                palette: mockPalette,
            },
        });

        render(<DivKitBody mxEvent={event} />);

        await waitFor(() => {
            expect(mockSetVariable).toHaveBeenCalledWith(
                expect.objectContaining({ name: "primary", value: "#ffffff" }),
            );
        });
    });
});
