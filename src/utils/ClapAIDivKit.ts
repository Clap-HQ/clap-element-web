/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { createVariable } from "@divkitframework/divkit/client";
import type { AnyVariable } from "@divkitframework/divkit/typings/variables";

/**
 * Type definitions for Clap AI message content structure
 */

export interface DivKitCardVariable {
    name: string;
    type: "string" | "number" | "integer" | "boolean" | "color" | "url" | "dict" | "array";
    value: string | number | boolean | object | unknown[];
}

export interface DivKitCard {
    log_id: string;
    states: unknown[];
    variables?: DivKitCardVariable[];
}

export interface ClapAIPalette {
    light?: Array<{ name: string; color: string }>;
    dark?: Array<{ name: string; color: string }>;
}

export interface ClapAIContent {
    "ac.clap.ai"?: {
        card?: DivKitCard;
        palette?: ClapAIPalette;
        message_type?: string;
        version?: string;
    };
    "body": string;
    "msgtype": string;
}

/**
 * Extracts the DivKit card from Clap AI message content.
 *
 * @param content - The message content object
 * @returns The DivKit card object, or null if not present
 */
export function extractDivKitCard(content: ClapAIContent): DivKitCard | null {
    const clapAI = content["ac.clap.ai"];
    if (!clapAI || !clapAI.card) {
        return null;
    }
    return clapAI.card;
}

/**
 * Converts palette colors to DivKit variables for the specified theme.
 *
 * @param palette - The palette object containing light and dark theme colors
 * @param theme - The theme to use ('light' or 'dark')
 * @returns Array of DivKit Variable instances
 */
export function getPaletteVariables(palette: ClapAIPalette, theme: "light" | "dark"): AnyVariable[] {
    const colors = palette[theme];
    if (!colors || !Array.isArray(colors)) {
        return [];
    }

    return colors.map((colorDef) => createVariable(colorDef.name, "color", colorDef.color));
}

/**
 * Converts card variables to DivKit Variable instances.
 *
 * @param card - The DivKit card object
 * @returns Array of DivKit Variable instances
 */
export function getCardVariables(card: DivKitCard): AnyVariable[] {
    if (!card.variables || !Array.isArray(card.variables)) {
        return [];
    }

    return card.variables.map((variable) => createVariable(variable.name, variable.type, variable.value));
}
