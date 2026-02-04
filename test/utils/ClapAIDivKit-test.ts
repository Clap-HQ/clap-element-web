/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { EventType, type MatrixEvent } from "matrix-js-sdk/src/matrix";

import {
    extractDivKitCard,
    getPaletteVariables,
    getCardVariables,
    handleClapAction,
    type ClapAIContent,
    type ClapAIPalette,
    type DivKitCard,
} from "../../src/utils/ClapAIDivKit";
import { mkEvent, stubClient } from "../test-utils";
import { MatrixClientPeg } from "../../src/MatrixClientPeg";

jest.mock("@divkitframework/divkit/client", () => ({
    createVariable: jest.fn((name: string, type: string, value: unknown) => ({ name, type, value })),
}));

describe("ClapAIDivKit", () => {
    describe("extractDivKitCard", () => {
        it("should return card when present", () => {
            const card: DivKitCard = {
                log_id: "test-card",
                states: [{ state_id: 0, div: { type: "text", text: "Hello" } }],
            };
            const content: ClapAIContent = {
                "msgtype": "m.text",
                "body": "fallback",
                "ac.clap.ai": { card },
            };

            const result = extractDivKitCard(content);

            expect(result).toEqual(card);
        });

        it("should return null when ac.clap.ai is missing", () => {
            const content: ClapAIContent = {
                msgtype: "m.text",
                body: "fallback",
            };

            const result = extractDivKitCard(content);

            expect(result).toBeNull();
        });

        it("should return null when card is missing", () => {
            const content: ClapAIContent = {
                "msgtype": "m.text",
                "body": "fallback",
                "ac.clap.ai": {},
            };

            const result = extractDivKitCard(content);

            expect(result).toBeNull();
        });
    });

    describe("getPaletteVariables", () => {
        const palette: ClapAIPalette = {
            light: [
                { name: "primary", color: "#000000" },
                { name: "secondary", color: "#ffffff" },
            ],
            dark: [
                { name: "primary", color: "#ffffff" },
                { name: "secondary", color: "#000000" },
            ],
        };

        it("should return light palette variables for light theme", () => {
            const result = getPaletteVariables(palette, "light");

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({ name: "primary", value: "#000000" }));
            expect(result[1]).toEqual(expect.objectContaining({ name: "secondary", value: "#ffffff" }));
        });

        it("should return dark palette variables for dark theme", () => {
            const result = getPaletteVariables(palette, "dark");

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(expect.objectContaining({ name: "primary", value: "#ffffff" }));
            expect(result[1]).toEqual(expect.objectContaining({ name: "secondary", value: "#000000" }));
        });

        it("should return empty array when palette theme is missing", () => {
            const partialPalette: ClapAIPalette = {
                light: [{ name: "primary", color: "#000000" }],
            };

            const result = getPaletteVariables(partialPalette, "dark");

            expect(result).toEqual([]);
        });

        it("should return empty array when palette colors is not an array", () => {
            const invalidPalette = {
                light: "invalid",
            } as unknown as ClapAIPalette;

            const result = getPaletteVariables(invalidPalette, "light");

            expect(result).toEqual([]);
        });
    });

    describe("getCardVariables", () => {
        it("should convert card variables to DivKit variables", () => {
            const card: DivKitCard = {
                log_id: "test",
                states: [],
                variables: [
                    { name: "stringVar", type: "string", value: "hello" },
                    { name: "numberVar", type: "number", value: 42 },
                    { name: "boolVar", type: "boolean", value: true },
                ],
            };

            const result = getCardVariables(card);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual(expect.objectContaining({ name: "stringVar", value: "hello" }));
            expect(result[1]).toEqual(expect.objectContaining({ name: "numberVar", value: 42 }));
            expect(result[2]).toEqual(expect.objectContaining({ name: "boolVar", value: true }));
        });

        it("should return empty array when variables is undefined", () => {
            const card: DivKitCard = {
                log_id: "test",
                states: [],
            };

            const result = getCardVariables(card);

            expect(result).toEqual([]);
        });

        it("should return empty array when variables is not an array", () => {
            const card = {
                log_id: "test",
                states: [],
                variables: "invalid",
            } as unknown as DivKitCard;

            const result = getCardVariables(card);

            expect(result).toEqual([]);
        });

        it("should handle empty variables array", () => {
            const card: DivKitCard = {
                log_id: "test",
                states: [],
                variables: [],
            };

            const result = getCardVariables(card);

            expect(result).toEqual([]);
        });
    });

    describe("handleClapAction", () => {
        const roomId = "!room:example.com";
        const userId = "@user:example.com";

        const createMockEvent = (): MatrixEvent => {
            return mkEvent({
                type: "m.room.message",
                room: roomId,
                user: userId,
                content: {
                    msgtype: "m.text",
                    body: "fallback",
                },
                event: true,
            });
        };

        const mockCard: DivKitCard = {
            log_id: "test-card",
            states: [
                {
                    state_id: 0,
                    div: {
                        type: "container",
                        items: [
                            {
                                type: "text",
                                text: "Click Me",
                                actions: [{ log_id: "button_click", url: "clap://action/test" }],
                            },
                        ],
                    },
                },
            ],
        };

        beforeEach(() => {
            stubClient();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("should send message with correct format for clap:// action", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");

            const event = createMockEvent();
            const action = { log_id: "button_click", url: "clap://action/test" };

            await handleClapAction(action, event, mockCard);

            expect(sendEventSpy).toHaveBeenCalledWith(
                roomId,
                EventType.RoomMessage,
                expect.objectContaining({
                    "msgtype": "m.text",
                    "body": "Click Me",
                    "ac.clap.action": {
                        url: "clap://action/test",
                        log_id: "button_click",
                    },
                }),
            );
        });

        it("should ignore non-clap:// protocol actions", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

            const event = createMockEvent();
            const action = { log_id: "external_link", url: "https://example.com" };

            await handleClapAction(action, event, mockCard);

            expect(sendEventSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "[ClapAIDivKit] Ignoring non-clap:// action:",
                "https://example.com",
            );

            consoleWarnSpy.mockRestore();
        });

        it("should use log_id as fallback when button text not found", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");

            const event = createMockEvent();
            const cardWithoutText: DivKitCard = {
                log_id: "test-card",
                states: [],
            };
            const action = { log_id: "unknown_action", url: "clap://action/unknown" };

            await handleClapAction(action, event, cardWithoutText);

            expect(sendEventSpy).toHaveBeenCalledWith(
                roomId,
                EventType.RoomMessage,
                expect.objectContaining({
                    body: "unknown_action",
                }),
            );
        });

        it("should not send message when room ID is missing", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");
            const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

            const eventWithoutRoom = mkEvent({
                type: "m.room.message",
                room: undefined,
                user: userId,
                content: { msgtype: "m.text", body: "test" },
                event: true,
            });

            const action = { log_id: "button_click", url: "clap://action/test" };

            await handleClapAction(action, eventWithoutRoom, mockCard);

            expect(sendEventSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith("[ClapAIDivKit] Cannot send message: no room ID");

            consoleErrorSpy.mockRestore();
        });

        it("should find button text from nested div structure", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");

            const nestedCard: DivKitCard = {
                log_id: "nested-card",
                states: [
                    {
                        state_id: 0,
                        div: {
                            type: "container",
                            items: [
                                {
                                    type: "container",
                                    items: [
                                        {
                                            type: "text",
                                            text: "Nested Button",
                                            action: { log_id: "nested_action", url: "clap://nested" },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            };

            const event = createMockEvent();
            const action = { log_id: "nested_action", url: "clap://nested" };

            await handleClapAction(action, event, nestedCard);

            expect(sendEventSpy).toHaveBeenCalledWith(
                roomId,
                EventType.RoomMessage,
                expect.objectContaining({
                    body: "Nested Button",
                }),
            );
        });

        it("should find button text by matching URL", async () => {
            const client = MatrixClientPeg.safeGet();
            const sendEventSpy = jest.spyOn(client, "sendEvent");

            const cardWithUrlMatch: DivKitCard = {
                log_id: "url-match-card",
                states: [
                    {
                        state_id: 0,
                        div: {
                            type: "text",
                            text: "URL Matched Button",
                            actions: [{ log_id: "different_id", url: "clap://specific/url" }],
                        },
                    },
                ],
            };

            const event = createMockEvent();
            const action = { log_id: "any_id", url: "clap://specific/url" };

            await handleClapAction(action, event, cardWithUrlMatch);

            expect(sendEventSpy).toHaveBeenCalledWith(
                roomId,
                EventType.RoomMessage,
                expect.objectContaining({
                    body: "URL Matched Button",
                }),
            );
        });
    });
});
