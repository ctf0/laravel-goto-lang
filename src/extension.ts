'use strict'

import {
    languages,
    ExtensionContext,
    window,
    workspace
} from 'vscode'
import LinkProvider from './providers/linkProvider'
import * as util from './util'

const debounce = require('lodash.debounce')
let providers = []

export function activate(context: ExtensionContext) {
    util.readConfig()

    // config
    workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('laravel-goto-lang')) {
            util.readConfig()
        }
    })

    // links
    setTimeout(() => {
        if (window.activeTextEditor) {
            initProvider()
        }

        window.onDidChangeTextEditorVisibleRanges(
            debounce(function (e) {
                clearAll()
                initProvider()
            }, 250)
        )

        window.onDidChangeActiveTextEditor(
            debounce(function (editor) {
                if (editor) {
                    clearAll()
                    initProvider()
                }
            }, 250)
        )
    }, 2000)

    // scroll
    util.scrollToText()
}

function initProvider() {
    providers.push(languages.registerDocumentLinkProvider(['php', 'blade'], new LinkProvider()))
}

function clearAll() {
    return providers.forEach((e) => e.dispose())
}

export function deactivate() {
    clearAll()
}
