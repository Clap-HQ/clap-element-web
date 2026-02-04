/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

/* See readme.md for tips on writing these tests. */

import { test, expect } from "../../element-web-test";

/**
 * Test data: AI message with DivKit card
 */
const createAIMessageWithDivKit = (cardText: string = "Test DivKit Card") => ({
    "msgtype": "m.text",
    "body": "Fallback text for AI message",
    "ac.clap.ai": {
        card: {
            log_id: "test_card",
            states: [
                {
                    state_id: 0,
                    div: {
                        type: "container",
                        items: [
                            {
                                type: "text",
                                text: cardText,
                            },
                            {
                                type: "container",
                                orientation: "horizontal",
                                items: [
                                    {
                                        type: "text",
                                        text: "승인",
                                        actions: [
                                            {
                                                log_id: "approve",
                                                url: "clap://action/approve",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        },
        palette: {
            light: [
                { name: "clap.bg.primary", color: "#FFFFFF" },
                { name: "clap.text.primary", color: "#000000" },
            ],
            dark: [
                { name: "clap.bg.primary", color: "#1A1A1A" },
                { name: "clap.text.primary", color: "#FFFFFF" },
            ],
        },
        message_type: "test",
        version: "1.0",
    },
});

/**
 * Plain AI message without DivKit card
 */
const createPlainAIMessage = () => ({
    msgtype: "m.text",
    body: "Plain text AI message without DivKit card",
});

test.describe("DivKit AI Messages", () => {
    test.use({
        displayName: "Alice",
        botCreateOpts: { displayName: "AI Bot" },
    });

    test("should render DivKit card in AI message", async ({ page, app, bot }) => {
        // Create test room
        const roomId = await app.client.createRoom({ name: "DivKit Test Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send AI message with DivKit card
        await bot.sendEvent(roomId, null, "m.room.message", createAIMessageWithDivKit());

        // Wait for message to appear
        const msgTile = page.locator(".mx_EventTile_last");
        await msgTile.waitFor();

        // Verify DivKit card is rendered
        const divKitBody = msgTile.locator(".mx_DivKitBody");
        await expect(divKitBody).toBeVisible();

        // Verify card content is visible
        await expect(divKitBody).toContainText("Test DivKit Card");

        // Take screenshot for visual verification
        await expect(msgTile).toMatchScreenshot("divkit-ai-message-rendered.png");
    });

    test("should render TextualBody when no DivKit card", async ({ page, app, bot }) => {
        // Create test room
        const roomId = await app.client.createRoom({ name: "Plain AI Message Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send plain AI message WITHOUT DivKit card
        await bot.sendEvent(roomId, null, "m.room.message", createPlainAIMessage());

        // Wait for message to appear
        const msgTile = page.locator(".mx_EventTile_last");
        await msgTile.waitFor();

        // Verify TextualBody is rendered (not DivKitBody)
        const textualBody = msgTile.locator(".mx_EventTile_body");
        await expect(textualBody).toBeVisible();
        await expect(textualBody).toContainText("Plain text AI message without DivKit card");

        // Verify DivKitBody is NOT rendered
        const divKitBody = msgTile.locator(".mx_DivKitBody");
        await expect(divKitBody).not.toBeVisible();
    });

    test("should send message when DivKit button clicked", async ({ page, app, bot }) => {
        // Create test room
        const roomId = await app.client.createRoom({ name: "Button Click Test Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send AI message with DivKit card containing button
        await bot.sendEvent(roomId, null, "m.room.message", createAIMessageWithDivKit());

        // Wait for message to appear
        const msgTile = page.locator(".mx_EventTile_last");
        await msgTile.waitFor();

        // Verify DivKit card is rendered
        const divKitBody = msgTile.locator(".mx_DivKitBody");
        await expect(divKitBody).toBeVisible();

        // Get initial message count
        const initialMessages = await page.locator(".mx_EventTile").count();

        // Click the button (DivKit renders button as text element with action)
        // The button text is "승인" (Approve)
        const button = divKitBody.locator("text=승인").first();
        await button.click();

        // Wait for new message to appear (button click should send a message)
        await page.waitForTimeout(500); // Give time for message to be sent
        const newMessages = await page.locator(".mx_EventTile").count();
        expect(newMessages).toBeGreaterThan(initialMessages);

        // Verify the new message was sent
        const lastMessage = page.locator(".mx_EventTile_last");
        await expect(lastMessage).toContainText("승인");

        // Take screenshot for verification
        await expect(lastMessage).toMatchScreenshot("divkit-button-click-message.png");
    });

    test("should apply palette colors based on theme", async ({ page, app, bot }) => {
        // Create test room
        const roomId = await app.client.createRoom({ name: "Theme Palette Test Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send AI message with palette
        await bot.sendEvent(roomId, null, "m.room.message", createAIMessageWithDivKit());

        // Wait for message to appear
        const msgTile = page.locator(".mx_EventTile_last");
        await msgTile.waitFor();

        // Verify DivKit card is rendered in light theme
        const divKitBody = msgTile.locator(".mx_DivKitBody");
        await expect(divKitBody).toBeVisible();

        // Take screenshot in light theme
        await expect(msgTile).toMatchScreenshot("divkit-light-theme.png");

        // Switch to dark theme
        await page.goto("#/user");
        await page.getByRole("button", { name: "Settings" }).click();
        await page.getByRole("tab", { name: "Appearance" }).click();

        // Wait for appearance settings to load
        await page.locator("text=Theme").waitFor();

        // Click dark theme option
        const darkThemeOption = page.locator("label").filter({ hasText: /Dark/ }).first();
        await darkThemeOption.click();

        // Wait for theme to change
        await page.waitForTimeout(500);

        // Close settings
        await page.keyboard.press("Escape");

        // Navigate back to room
        await page.goto(`#/room/${roomId}`);
        await page.locator(".mx_RoomView").waitFor();

        // Verify DivKit card is still rendered in dark theme
        const divKitBodyDark = page.locator(".mx_EventTile_last").locator(".mx_DivKitBody");
        await expect(divKitBodyDark).toBeVisible();

        // Take screenshot in dark theme
        await expect(page.locator(".mx_EventTile_last")).toMatchScreenshot("divkit-dark-theme.png");
    });

    test("should handle multiple DivKit messages in timeline", async ({ page, app, bot }) => {
        // Create test room
        const roomId = await app.client.createRoom({ name: "Multiple DivKit Messages Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send multiple AI messages with different card content
        await bot.sendEvent(roomId, null, "m.room.message", createAIMessageWithDivKit("First DivKit Card"));
        await bot.sendEvent(roomId, null, "m.room.message", createAIMessageWithDivKit("Second DivKit Card"));
        await bot.sendEvent(roomId, null, "m.room.message", createPlainAIMessage());

        // Wait for all messages to appear
        await page.waitForTimeout(500);

        // Verify all messages are rendered
        const eventTiles = page.locator(".mx_EventTile");
        const tileCount = await eventTiles.count();
        expect(tileCount).toBeGreaterThanOrEqual(3);

        // Verify DivKit cards are rendered
        const divKitBodies = page.locator(".mx_DivKitBody");
        const divKitCount = await divKitBodies.count();
        expect(divKitCount).toBeGreaterThanOrEqual(2);

        // Verify plain message is rendered
        const lastMessage = page.locator(".mx_EventTile_last");
        await expect(lastMessage.locator(".mx_EventTile_body")).toContainText(
            "Plain text AI message without DivKit card",
        );

        // Take screenshot showing multiple messages
        await expect(page.locator(".mx_RoomView_body")).toMatchScreenshot("divkit-multiple-messages.png");
    });

    test("should render DivKit card with custom variables", async ({ page, app, bot }) => {
        // Create AI message with card variables
        const messageWithVariables = {
            "msgtype": "m.text",
            "body": "AI message with variables",
            "ac.clap.ai": {
                card: {
                    log_id: "test_card_vars",
                    states: [
                        {
                            state_id: 0,
                            div: {
                                type: "container",
                                items: [
                                    {
                                        type: "text",
                                        text: "Variable Test",
                                    },
                                ],
                            },
                        },
                    ],
                    variables: [
                        { name: "testVar", type: "string", value: "test value" },
                        { name: "numberVar", type: "number", value: 42 },
                    ],
                },
                message_type: "test",
                version: "1.0",
            },
        };

        // Create test room
        const roomId = await app.client.createRoom({ name: "Variables Test Room" });
        await page.goto(`#/room/${roomId}`);

        // Wait for room to load
        await page.locator(".mx_RoomView").waitFor();

        // Send message with variables
        await bot.sendEvent(roomId, null, "m.room.message", messageWithVariables);

        // Wait for message to appear
        const msgTile = page.locator(".mx_EventTile_last");
        await msgTile.waitFor();

        // Verify DivKit card is rendered
        const divKitBody = msgTile.locator(".mx_DivKitBody");
        await expect(divKitBody).toBeVisible();

        // Verify card content
        await expect(divKitBody).toContainText("Variable Test");

        // Take screenshot
        await expect(msgTile).toMatchScreenshot("divkit-with-variables.png");
    });
});
