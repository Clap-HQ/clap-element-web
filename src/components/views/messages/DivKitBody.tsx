/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useEffect, useRef } from "react";
import { render, createGlobalVariablesController } from "@divkitframework/divkit/client";
import type { DivJson } from "@divkitframework/divkit/typings/common";
import "@divkitframework/divkit/dist/client.css";

import { useTheme } from "../../../hooks/useTheme";
import {
    extractDivKitCard,
    getPaletteVariables,
    getCardVariables,
    handleClapAction,
    type ClapAIContent,
} from "../../../utils/ClapAIDivKit";
import type { IBodyProps } from "./IBodyProps";

const DivKitBody = React.forwardRef<HTMLDivElement, IBodyProps>((props, ref) => {
    const { mxEvent } = props;
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);

    const content = mxEvent.getContent() as ClapAIContent;
    const card = extractDivKitCard(content);

    useEffect(() => {
        if (!card || !containerRef.current) {
            return;
        }

        const eventId = mxEvent.getId() ?? "divkit-card";
        const clapAI = content["ac.clap.ai"];
        const palette = clapAI?.palette;

        const themeMode = theme.includes("dark") ? "dark" : "light";

        const paletteVars = palette ? getPaletteVariables(palette, themeMode) : [];
        const cardVars = getCardVariables(card);
        const allVariables = [...paletteVars, ...cardVars];

        const globalVariablesController = createGlobalVariablesController();
        for (const variable of allVariables) {
            globalVariablesController.setVariable(variable);
        }

        const divJson: DivJson = {
            card: card as DivJson["card"],
        };

        render({
            id: eventId,
            target: containerRef.current,
            json: divJson,
            globalVariablesController,
            onCustomAction: (action) => {
                handleClapAction(action, mxEvent, card);
            },
            onError: (details) => {
                console.error("[DivKitBody] Render error:", details);
            },
        });

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [mxEvent, theme, card, content]);

    if (!card) {
        return null;
    }

    return <div ref={containerRef} className="mx_DivKitBody" />;
});

DivKitBody.displayName = "DivKitBody";

export default DivKitBody;
