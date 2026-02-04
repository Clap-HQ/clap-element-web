/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ReactNode } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import type { ClapAIContent } from "../../../utils/ClapAIDivKit";

interface IProps {
    mxEvent: MatrixEvent;
    children: ReactNode;
}

interface IState {
    error?: Error;
}

export default class DivKitErrorBoundary extends React.Component<IProps, IState> {
    public constructor(props: IProps) {
        super(props);
        this.state = {};
    }

    public static getDerivedStateFromError(error: Error): Partial<IState> {
        return { error };
    }

    public componentDidCatch(error: Error): void {
        console.error("[DivKitErrorBoundary] DivKit rendering failed:", error);
    }

    public render(): ReactNode {
        if (this.state.error) {
            const content = this.props.mxEvent.getContent() as ClapAIContent;
            const fallbackText = content?.body || "Failed to render message";

            return (
                <div className="mx_DivKitBody_error">
                    <p>{fallbackText}</p>
                </div>
            );
        }

        return this.props.children;
    }
}
