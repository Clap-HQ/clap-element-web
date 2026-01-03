/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import type { MouseEvent, ReactNode } from "react";

/**
 * Common props for all EventTile layout components
 * Contains pre-rendered elements and handlers needed by different layouts
 */
export interface EventTileLayoutProps {
    // Pre-rendered components (using ReactNode to allow all valid React children)
    avatar: ReactNode;
    sender: ReactNode;
    timestamp: ReactNode;
    linkedTimestamp: ReactNode;
    ircTimestamp: ReactNode;
    groupTimestamp: ReactNode;
    groupPadlock: ReactNode;
    ircPadlock: ReactNode;
    replyChain: ReactNode;
    actionBar: ReactNode;
    pinnedMessageBadge: ReactNode;
    reactionsRow: ReactNode;
    threadInfo: ReactNode;
    contextMenu: ReactNode;
    msgOption: ReactNode;
    tileContent: ReactNode;

    // Layout state
    hasFooter: boolean;
    isOwnEvent: boolean;

    // Line element props
    lineId: string;
    lineClasses: string;
    onContextMenu: (ev: MouseEvent) => void;
}
