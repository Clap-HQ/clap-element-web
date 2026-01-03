/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

import type { EventTileLayoutProps } from "./types";

/**
 * Bubble layout for EventTile
 * Similar to Group layout but with different pinnedMessageBadge positioning
 */
export function EventTileBubbleLayout({
    avatar,
    sender,
    lineId,
    lineClasses,
    onContextMenu,
    contextMenu,
    groupTimestamp,
    groupPadlock,
    replyChain,
    tileContent,
    actionBar,
    hasFooter,
    pinnedMessageBadge,
    reactionsRow,
    threadInfo,
    msgOption,
    isOwnEvent,
}: EventTileLayoutProps): JSX.Element {
    return (
        <>
            {avatar}
            <div className="mx_EventTile_content_wrapper">
                {sender}
                <div id={lineId} className={lineClasses} key="mx_EventTile_line" onContextMenu={onContextMenu}>
                    {contextMenu}
                    {groupTimestamp}
                    {groupPadlock}
                    {replyChain}
                    {tileContent}
                    {actionBar}
                </div>
                {hasFooter && (
                    <div className="mx_EventTile_footer">
                        {/* In Bubble layout, pinnedMessageBadge position depends on message ownership */}
                        {!isOwnEvent && pinnedMessageBadge}
                        {reactionsRow}
                        {isOwnEvent && pinnedMessageBadge}
                    </div>
                )}
                {threadInfo}
            </div>
            {msgOption}
        </>
    );
}
