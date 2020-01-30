'use strict'

import { languages, ExtensionContext, window } from 'vscode'
import LinkProvider from './providers/linkProvider'

const debounce = require('lodash.debounce')


export function activate(context: ExtensionContext) {
    setTimeout(() => {
        context.subscriptions.push(
            languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider())
        )

        window.onDidChangeTextEditorVisibleRanges(
            debounce(function (e) {
                context.subscriptions.push(
                    languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider())
                )
            }, 250)
        )
    }, 2000)
}

export function deactivate() {
    //
}
